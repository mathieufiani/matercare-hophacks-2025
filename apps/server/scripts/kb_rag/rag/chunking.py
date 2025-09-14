# 02_chunk_with_gemini.py  (patched loader)
import io, os, re, json, glob, pathlib
from typing import List, Dict, Any
from urllib.parse import urlparse
from slugify import slugify

from dotenv import load_dotenv
import google.generativeai as genai

# ------------- Config -------------
load_dotenv()

GEMINI_API_KEY = os.environ["GOOGLE_API_KEY"]

CHUNK_MODEL = "gemini-2.0-flash"   # keep as you set; switch to gemini-1.5-pro if needed
INPUT_DIR   = "/Users/mathieufiani/work/Dev/hackaton/hophacks-2025-v2/apps/server/scripts/kb_rag/sources"
OUTPUT_DIR  = "./chunks"

TARGET_TOKENS = 600
MIN_TOKENS    = 200
MAX_INPUT_CHARS = 40000

# ------------- Init -------------
genai.configure(api_key=GEMINI_API_KEY)
pathlib.Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)

# ------------- Helpers -------------
CTRL_ILLEGAL_RE = re.compile(r'[\x00-\x08\x0B\x0C\x0E-\x1F]')  # keep \t,\n,\r

def load_loose_json(path: str) -> Dict[str, Any]:
    """
    1) Try strict JSON.
    2) If it fails (e.g., content has raw newlines), extract "url" and "content"
       with regex and return a proper Python dict.
    """
    raw = open(path, "r", encoding="utf-8-sig", errors="strict").read()
    # normalize newlines and strip illegal control chars (but keep \n \t \r)
    raw = raw.replace("\r\n", "\n").replace("\r", "\n")
    raw = CTRL_ILLEGAL_RE.sub(" ", raw)

    # 1) strict path
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    # 2) loose path (regex extraction)
    m_url = re.search(r'"url"\s*:\s*"([^"]+)"', raw)
    if not m_url:
        raise ValueError(f"{path}: could not find a valid \"url\" field")

    # capture everything between "content":" and the last closing quote before the final }
    m_content = re.search(r'"content"\s*:\s*"(.*)"\s*}\s*$', raw, re.S)
    if not m_content:
        # handle trailing whitespace/newlines after }
        m_content = re.search(r'"content"\s*:\s*"(.*)"\s*}\s*[\n\s]*$', raw, re.S)
    if not m_content:
        raise ValueError(f"{path}: could not parse the \"content\" field")

    url = m_url.group(1)
    content_raw = m_content.group(1)

    # Undo common pseudo-escaping (if any) and convert to real Python text
    # - keep the actual newlines we just read; json.dump will escape later if needed
    content_text = content_raw

    return {"url": url, "content": content_text}

def window_text(text: str, max_chars: int) -> List[str]:
    if len(text) <= max_chars:
        return [text]
    parts = re.split(r"\n{2,}", text)
    windows, cur = [], ""
    for p in parts:
        if len(cur) + len(p) + 2 <= max_chars:
            cur = f"{cur}\n\n{p}" if cur else p
        else:
            if cur: windows.append(cur)
            cur = p
    if cur:
        windows.append(cur)
    return windows

def gemini_chunk(content: str, url: str) -> Dict[str, Any]:
    prompt = f"""
        You are a document chunker. Split the document into context-aware chunks aligned with natural sections/paragraphs.

        Rules:
        - Aim for ~{TARGET_TOKENS} tokens per chunk (acceptable >= {MIN_TOKENS}).
        - Keep sentences intact; prefer headings/section boundaries.
        - Return STRICT JSON only (no prose/markdown) with schema:
        {{
        "doc_url": "{url}",
        "chunks": [
            {{"section_title":"string","start_char":int,"end_char":int,"text":"string"}}
        ]
        }}
        - Each chunk's "text" must be a contiguous excerpt of the original, matching [start_char, end_char).

        Document:
        <<<DOC_START>>>
        {content}
        <<<DOC_END>>>
    """.strip()

    model = genai.GenerativeModel(CHUNK_MODEL)
    resp = model.generate_content(prompt)
    txt = resp.text or ""
    try:
        return json.loads(txt)
    except Exception:
        m = re.search(r"\{.*\}", txt, re.S)
        if not m:
            raise RuntimeError("Gemini did not return JSON.")
        return json.loads(m.group(0))

def write_chunk_files(doc_slug: str, url: str, host: str, chunks: List[Dict[str, Any]]) -> int:
    out_dir = pathlib.Path(OUTPUT_DIR) / doc_slug
    out_dir.mkdir(parents=True, exist_ok=True)
    count = 0
    for i, ch in enumerate(chunks, 1):
        text = (ch.get("text") or "").strip()
        if not text:
            continue
        header = (
            f"URL: {url}\nSOURCE: {host}\nSECTION: {ch.get('section_title','')}\n"
            f"START: {ch.get('start_char')}\nEND: {ch.get('end_char')}\n\n"
        )
        (out_dir / f"chunk_{i:04d}.txt").write_text(header + text, encoding="utf-8")
        count += 1
    return count

# ------------- Main -------------
if __name__ == "__main__":
    files = glob.glob(os.path.join(INPUT_DIR, "*.json"))

    if not files:
        print(f"No JSON files in {INPUT_DIR}")
        raise SystemExit(0)

    total_files, total_chunks = 0, 0
    for path in files:
        try:
            obj = load_loose_json(path)
        except Exception as e:
            print(f"[ERROR] {e}")
            continue

        url = (obj.get("url") or "").strip()
        content = (obj.get("content") or "").strip()
        if not url or not content:
            print(f"[SKIP] Missing url/content: {path}")
            continue

        host = urlparse(url).netloc or "unknown-host"
        doc_slug = slugify(url, max_length=120)

        all_chunks: List[Dict[str, Any]] = []
        for w_idx, win in enumerate(window_text(content, MAX_INPUT_CHARS), 1):
            try:
                result = gemini_chunk(win, url)
                chunks = result.get("chunks", [])
                if len(content) > len(win):
                    base = content.find(win)
                    for c in chunks:
                        if isinstance(c.get("start_char"), int):
                            c["start_char"] = base + c["start_char"]
                        if isinstance(c.get("end_char"), int):
                            c["end_char"] = base + c["end_char"]
                all_chunks.extend(chunks)
            except Exception as e:
                print(f"[WARN] Chunking window {w_idx} failed for {path}: {e}")

        wrote = write_chunk_files(doc_slug, url, host, all_chunks)
        print(f"{path}: wrote {wrote} chunks to ./chunks/{doc_slug}/")
        total_files += 1
        total_chunks += wrote

    print(f"Done. Processed {total_files} docs; wrote {total_chunks} chunk files.")
