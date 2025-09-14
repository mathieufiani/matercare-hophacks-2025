import os
import re
import textwrap
from typing import List, Dict, Any
from dotenv import load_dotenv
from pinecone import Pinecone
from rank_bm25 import BM25Okapi

# CORRECTED: Import the main library
import google.generativeai as genai

# --- Load Environment Variables ---
load_dotenv()

# --- ENV / Config ---
GEMINI_API_KEY   = os.environ.get("GOOGLE_API_KEY")
PINECONE_API_KEY = os.environ.get("PINECONE_API_KEY")
PINECONE_INDEX   = os.getenv("PINECONE_INDEX")
NAMESPACE        = "ppd"

# CORRECTED: Use the latest, recommended embedding model
EMBED_MODEL = "models/text-embedding-004"
OUTPUT_DIM  = 768
TOP_K       = 18      # Retrieve more, then re-rank
FINAL_K     = 6

# ---------- Client Initialization ----------

# CORRECTED: Configure the Gemini client using the top-level function
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in environment variables.")
genai.configure(api_key=GEMINI_API_KEY)

# Initialize Pinecone client
if not PINECONE_API_KEY:
    raise ValueError("PINECONE_API_KEY not found in environment variables.")
pc = Pinecone(api_key=PINECONE_API_KEY)
index = pc.Index(PINECONE_INDEX)
print("Clients initialized.")

# ---------- Helper Functions ----------

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

def gemini_answer(user_text: str, context_items: List[Dict[str, str]]):
    """Generates a grounded answer using the Gemini Pro model."""
    grounding = "\n\n".join(
        [f"- Source: {c.get('source', 'N/A')} | URL: {c.get('url', 'N/A')}\n  Snippet: {c.get('snippet', '')}"
         for c in context_items]
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

    # CORRECTED: Initialize the model and generate content
    model = genai.GenerativeModel(
        model_name="gemini-2.0-flash",
        system_instruction=system_prompt,
    )
    
    generation_config = genai.types.GenerationConfig(
        temperature=0.2,
    )
    
    response = model.generate_content(
        user_prompt,
        generation_config=generation_config
    )
    return response.text.strip()

# --- Main Execution Block ---

if __name__ == "__main__":
    # Example query (replace with any user input)
    question = "I feel really detached from my baby and ashamed—what can I do this week to feel more connected?"
    
    print("1. Performing vector search...")
    matches = vector_search(question, k=TOP_K)
    if not matches:
        print("\nNo matches found. Please ensure you have ingested the data into your Pinecone index.")
        raise SystemExit(0)
    
    print(f"2. Found {len(matches)} initial matches. Re-ranking with BM25...")
    top = bm25_rerank(question, matches, final_k=FINAL_K)
    
    print("3. Building context from top matches...")
    ctx = build_context(question, top)

    print("\n--- Top Grounding Snippets ---")
    for i, c in enumerate(ctx, 1):
        print(f"{i}. Source: {c.get('source', 'N/A')} | URL: {c.get('url', 'N/A')}\n   Snippet: {c.get('snippet', '')}\n")

    print("\n--- Generated Answer ---")
    answer = gemini_answer(question, ctx)
    print(answer)