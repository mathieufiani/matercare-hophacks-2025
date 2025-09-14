from typing import Optional, List, Dict, Any
import os
import json
import re
import textwrap
import google.generativeai as genai
from rank_bm25 import BM25Okapi
from dotenv import load_dotenv
from pinecone import Pinecone


# ─────────────────────────────────────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────────────────────────────────────
_api_key = os.getenv("GOOGLE_API_KEY")
GEMINI_API_KEY   = os.environ.get("GOOGLE_API_KEY")
PINECONE_API_KEY = os.environ.get("PINECONE_API_KEY")
PINECONE_INDEX   = os.getenv("PINECONE_INDEX")
if _api_key:
    genai.configure(api_key=_api_key)
else:
    raise ValueError("GOOGLE_API_KEY environment variable not set.")


MODEL_NAME = "gemini-2.0-flash"
# CORRECTED: Use the latest, recommended embedding model
EMBED_MODEL = "models/text-embedding-004"
OUTPUT_DIM  = 768
TOP_K       = 18      # Retrieve more, then re-rank
FINAL_K     = 6
NAMESPACE="ppd"
pc = Pinecone(api_key=PINECONE_API_KEY)
index = pc.Index(PINECONE_INDEX)
print("Clients initialized.")

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────
def _extract_json(s: str) -> dict:
    """
    Extract the first valid JSON object from a string. Handles code fences.
    Returns {} on failure.
    """
    if not s:
        return {}
    # Strip code fences if present
    fence = re.search(r"```(?:json)?\s*(.*?)\s*```", s, flags=re.DOTALL | re.IGNORECASE)
    candidate = fence.group(1) if fence else s
    # Find the first {...} block
    first_brace = candidate.find("{")
    last_brace = candidate.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace >= first_brace:
        candidate = candidate[first_brace:last_brace+1]
    try:
        return json.loads(candidate)
    except Exception:
        return {}


def _safe_text_from_response(resp) -> str:
    """
    Gemini SDK sometimes exposes .text or requires walking candidates.
    """
    try:
        if getattr(resp, "text", None):
            return resp.text
        if getattr(resp, "candidates", None):
            cand0 = resp.candidates[0]
            if cand0 and cand0.content and cand0.content.parts:
                part0 = cand0.content.parts[0]
                if hasattr(part0, "text"):
                    return part0.text
        return ""
    except Exception:
        return ""


# ─────────────────────────────────────────────────────────────────────────────
# 1) Intent classification → STRICT JSON: {"intent": 0|1|2}
# ─────────────────────────────────────────────────────────────────────────────
def check_intent(user_text: str) -> dict:
    """
    Returns STRICT JSON dict: {"intent": 0|1|2}
      - 0: conversation that does NOT require RAG
      - 1: conversation that DOES require RAG
      - 2: conversation indicating the user needs help / crisis / safety risk
    """
    system_prompt = textwrap.dedent("""
        You are a precise intent classifier for a postpartum support chatbot.
        You must output STRICT JSON with exactly one key "intent" and an integer value:
        - 0 → general conversation that does NOT require retrieval-augmented generation (RAG).
                Small talk, emotional check-ins, validation, reflective listening.
        - 1 → conversation that DOES require RAG (the user asks for factual, clinical, policy,
                or resource info that should be grounded in external snippets).
                This includes discussions of symptoms or experiences that may indicate postpartum depression (PPD),
                such as persistent sadness, mood swings, anxiety, trouble bonding with the baby, or changes in sleep/appetite.
        - 2 → conversation indicating HELP is needed (safety risk or crisis), including:
                self-harm, harm to baby/others, psychosis signs (confusion, delusions, hallucinations),
                suicidal ideation, domestic violence, medical emergencies, or urgent danger.


        Rules:
        - Output ONLY JSON, no prose, no markdown, no explanation.
        - If unsure, choose the safer higher category between 0 and 1; if any crisis signal appears, return 2.
    """).strip()


    user_prompt = f"User message:\n{user_text}\n\nReturn only JSON like {{\"intent\": 0}}."


    model = genai.GenerativeModel(
        model_name=MODEL_NAME,
        system_instruction=system_prompt,
    )
    response = model.generate_content(
        user_prompt,
        generation_config=genai.types.GenerationConfig(temperature=0.0),
    )
    raw = _safe_text_from_response(response)
    obj = _extract_json(raw)


    # Fallbacks if the model misbehaves:
    intent = obj.get("intent")
    if isinstance(intent, int) and intent in (0, 1, 2):
        return {"intent": intent}


    # Very conservative heuristic fallback:
    text_lc = (user_text or "").lower()
    crisis_signals = [
        "suicide", "kill myself", "end my life", "want to die",
        "hurt my baby", "hurt the baby", "harm my baby",
        "voices", "hallucination", "delusion", "psychosis",
        "emergency", "urgent help", "call 911", "988", "self harm", "self-harm",
        "kill my baby", "kill him", "kill her", "hurt myself", "hurt others",
    ]
    if any(tok in text_lc for tok in crisis_signals):
        return {"intent": 2}
    # Heuristic: questions that look factual → RAG
    if "what is" in text_lc or "how do" in text_lc or "can you provide" in text_lc or "link" in text_lc:
        return {"intent": 1}
    return {"intent": 0}


# ─────────────────────────────────────────────────────────────────────────────
# 2) Answering functions
# ─────────────────────────────────────────────────────────────────────────────
def gemini_chitchat(user_text: str) -> str:
    """
    Non-RAG supportive response for intent==0.
    """
    system_prompt = textwrap.dedent("""
        You are a warm, supportive postpartum assistant for general conversation.
        Be empathetic, validating, concise, and non-clinical. Do not give medical advice.
        Offer gentle coping ideas if appropriate (breathing, journaling, talking to a trusted person).
    """).strip()


    user_prompt = f"{user_text}"
    model = genai.GenerativeModel(model_name=MODEL_NAME, system_instruction=system_prompt)
    response = model.generate_content(
        user_prompt,
        generation_config=genai.types.GenerationConfig(temperature=0.4),
    )
    return _safe_text_from_response(response).strip() or "I'm here with you. Tell me more about how you're feeling."


def gemini_rag(user_text: str, context_items: List[Dict[str, str]]) -> str:
    """
    RAG answer for intent==1 using provided context snippets.
    """
    grounding = "\n\n".join(
        [f"- Source: {c.get('source', 'N/A')} | URL: {c.get('url', 'N/A')}\n  Snippet: {c.get('snippet', '')}"
         for c in (context_items or [])]
    )


    system_prompt = textwrap.dedent("""
       You are a supportive postpartum assistant for educational purposes. You must adhere to the following rules:
        1. Use ONLY the provided context snippets as your primary source of truth.
        2. Be warm, non-judgmental, concise, and include actionable coping steps where appropriate.
        3. Do NOT prescribe or suggest specific medications, doses, or schedules. If asked, state that you cannot provide prescription advice and recommend consulting a licensed clinician.
        4. If you detect crisis language (intent to self-harm/harm others, postpartum psychosis signs), advise the user to seek immediate help from a local emergency number or a crisis hotline like 988 in the US.
    """).strip()


    user_prompt = f"""
        User question:
        {user_text}


        Grounding snippets (cite sources inline like [Source: NAME]):
        {grounding}


        Respond with a short, supportive answer grounded in the snippets. If the information is not in the snippets, say so and suggest a next best step (e.g., talk therapy, support group, screening like EPDS).
    """.strip()


    model = genai.GenerativeModel(model_name=MODEL_NAME, system_instruction=system_prompt)
    response = model.generate_content(
        user_prompt,
        generation_config=genai.types.GenerationConfig(temperature=0.2),
    )
    return _safe_text_from_response(response).strip() or "I couldn't find that in the provided materials. Would you like me to look for reliable resources?"


def crisis_message() -> str:
    """
    For intent==2. Keep it brief, clear, and safety-forward. No diagnosis.
    """
    return (
        "I’m really glad you reached out. Your safety matters. If you feel in danger or have thoughts of harming yourself or your baby, "
        "please call your local emergency number now. In the U.S., you can dial 988 for the Suicide & Crisis Lifeline (24/7). "
        "If you can, consider contacting a trusted person nearby. I’m here to listen."
    )


# ─────────────────────────────────────────────────────────────────────────────
# 3) Orchestrator (returns a STRING)
# ─────────────────────────────────────────────────────────────────────────────

def embed_texts(texts: List[str]) -> List[List[float]]:
    """Generates embeddings for a list of texts using the Gemini API."""
    # CORRECTED: Simplified API call for embeddings
    result = genai.embed_content(
        model=EMBED_MODEL,
        content=texts,
        task_type="retrieval_query" # Use "retrieval_query" for user queries
    )
    return result['embedding']

def vector_search(query: str, k=TOP_K):
    """Performs a vector search in Pinecone and normalizes the results."""
    vec = embed_texts([query])[0]
    res = index.query(
        vector=vec, top_k=k, include_metadata=True, namespace=NAMESPACE
    )
    # The new pinecone-client returns a dict-like object
    matches = res.get("matches", [])
    return [
        {"id": m["id"], "score": m["score"], "metadata": m["metadata"]}
        for m in matches
    ]

def bm25_rerank(query: str, matches: List[Dict[str, Any]], final_k=FINAL_K):
    """Re-ranks a list of matches using BM25 lexical search."""
    docs = [
        m["metadata"].get("text", "") for m in matches
    ]
    tokenized_docs = [re.findall(r"\w+", d.lower()) for d in docs]
    
    # Check for empty documents to avoid BM25 errors
    if not any(tokenized_docs):
        return matches[:final_k]
        
    bm25 = BM25Okapi(tokenized_docs)
    query_tokens = re.findall(r"\w+", query.lower())
    scores = bm25.get_scores(query_tokens)
    
    # Sort matches by BM25 score and return the top `final_k`
    sorted_matches = sorted(zip(matches, scores), key=lambda x: x[1], reverse=True)
    return [match for match, score in sorted_matches][:final_k]

def compress_snippet(query: str, text: str, max_sents=3):
    """Extracts the most relevant sentences from a text snippet."""
    sents = re.split(r'(?<=[.!?])\s+', text)
    if not sents:
        return ""
        
    q_terms = set(re.findall(r"\w+", query.lower()))
    priority_keywords = {
        "cbt", "interpersonal", "therapy", "support", "screen", "epds", "sleep",
        "bond", "intrusive", "grounding", "coping", "psychosis"
    }
    
    keep = []
    for s in sents:
        lowered_s = s.lower()
        if any(term in lowered_s for term in q_terms) or any(kw in lowered_s for kw in priority_keywords):
            keep.append(s.strip())
        if len(keep) >= max_sents:
            break
            
    return " ".join(keep) if keep else " ".join(sents[:max_sents])

def build_context(query: str, top_matches: List[Dict[str, Any]]):
    """Builds a formatted context dictionary from top matches."""
    ctx = []
    for m in top_matches:
        md = m.get("metadata", {})
        preview = md.get("text", "")
        comp = compress_snippet(query, preview, max_sents=3)
        ctx.append({
            "url": md.get("url", ""),
            "source": md.get("source", ""),
            "section": md.get("section", ""),
            "doc_id": md.get("doc_id", ""),
            "snippet": comp
        })
    return ctx


def gemini_answer(user_text: str,
                 *,
                 user_id: Optional[str] = None,
                 context_items: Optional[List[Dict[str, str]]] = None) -> str:
   """Decides the path and returns a plain string reply."""
   intent = check_intent(user_text).get("intent", 0)
   print(intent)
   if intent == 0:
       return gemini_chitchat(user_text)
   elif intent == 1:
        print("1. Performing vector search...")
        matches = vector_search(user_text, k=TOP_K)
        if not matches:
            print("\nNo matches found. Please ensure you have ingested the data into your Pinecone index.")
            raise SystemExit(0)
        
        print(f"2. Found {len(matches)} initial matches. Re-ranking with BM25...")
        top = bm25_rerank(user_text, matches, final_k=FINAL_K)
        
        print("3. Building context from top matches...")
        ctx = build_context(user_text, top)

        print("\n--- Top Grounding Snippets ---")
        for i, c in enumerate(ctx, 1):
            print(f"{i}. Source: {c.get('source', 'N/A')} | URL: {c.get('url', 'N/A')}\n   Snippet: {c.get('snippet', '')}\n")

        print("\n--- Generated Answer ---")
        answer = gemini_rag(user_text, ctx)
        return answer
   else:
       return crisis_message()






