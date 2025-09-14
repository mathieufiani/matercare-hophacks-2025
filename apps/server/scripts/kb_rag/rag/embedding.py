import os
import pathlib
import time
from typing import List, Dict, Any

from dotenv import load_dotenv
from pinecone import Pinecone, ServerlessSpec
import google.generativeai as genai

# Load environment variables from .env file
load_dotenv()

# --- ENV / Config ---
GEMINI_API_KEY   = os.environ.get("GOOGLE_API_KEY")
PINECONE_API_KEY = os.environ.get("PINECONE_API_KEY")
PINECONE_INDEX   = os.getenv("PINECONE_INDEX", "ppd-v1")
PINECONE_REGION  = os.getenv("PINECONE_REGION", "us-east-1")
NAMESPACE        = "ppd"

# Use the recommended model for RAG embeddings and set its dimensionality
EMBED_MODEL      = "models/text-embedding-004"
OUTPUT_DIMENSIONALITY = 768

# CORRECTED: Path to the directory containing all the source folders
CHUNKS_DIR = "/Users/mathieufiani/work/Dev/hackaton/hophacks-2025-v2/apps/server/scripts/kb_rag/rag/chunks"

# Optional: To process only specific sources, add their folder names to this list.
# Leave the list empty to process all folders inside CHUNKS_DIR.
ONLY_DOCS = []

# Batch sizes
EMBED_BATCH = 96   # Gemini list-of-strings per call (max 100)
UPSERT_BATCH = 96  # Pinecone upsert batch

# --- Helpers ---

def parse_header_and_text(path: pathlib.Path) -> Dict[str, Any]:
    """Parses a chunk file into metadata and text content."""
    raw = path.read_text(encoding="utf-8", errors="ignore")
    header, _, body = raw.partition("\n\n")
    meta = {"url": "", "source": "", "section": "", "start_char": None, "end_char": None}
    for line in header.splitlines():
        if line.startswith("URL:"):
            meta["url"] = line.split("URL:", 1)[1].strip()
        elif line.startswith("SOURCE:"):
            meta["source"] = line.split("SOURCE:", 1)[1].strip()
        elif line.startswith("SECTION:"):
            meta["section"] = line.split("SECTION:", 1)[1].strip()
        elif line.startswith("START:"):
            v = line.split("START:", 1)[1].strip()
            meta["start_char"] = int(v) if v.isdigit() else None
        elif line.startswith("END:"):
            v = line.split("END:", 1)[1].strip()
            meta["end_char"] = int(v) if v.isdigit() else None
    return {"meta": meta, "text": body.strip()}

def chunk_list(xs: List[Any], n: int):
    """Splits a list into smaller lists of size n."""
    for i in range(0, len(xs), n):
        yield xs[i:i + n]

# --- Client Initialization ---

# Configure the Gemini client using the API key
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY not found in environment variables.")
genai.configure(api_key=GEMINI_API_KEY)

# Initialize Pinecone client
if not PINECONE_API_KEY:
    raise ValueError("PINECONE_API_KEY not found in environment variables.")
pc = Pinecone(api_key=PINECONE_API_KEY)

# Ensure index exists with the correct dimension and metric
if PINECONE_INDEX not in pc.list_indexes().names():
    print(f"Creating Pinecone index: {PINECONE_INDEX}...")
    pc.create_index(
        name=PINECONE_INDEX,
        dimension=OUTPUT_DIMENSIONALITY,  # Must match your embedding model
        metric="cosine",                 # Recommended for semantic search
        spec=ServerlessSpec(cloud="aws", region=PINECONE_REGION),
    )
index = pc.Index(PINECONE_INDEX)
print("Pinecone index is ready.")

# --- Main Execution Logic ---

if __name__ == "__main__":
    # Resolve which source folders to process
    all_dirs = [p for p in pathlib.Path(CHUNKS_DIR).glob("*") if p.is_dir()]
    if ONLY_DOCS:
        targets = [d for d in all_dirs if d.name in ONLY_DOCS]
    else:
        targets = all_dirs

    if not targets:
        print(f"No matching source folders found in '{CHUNKS_DIR}'. Check the path and your ONLY_DOCS list.")
        raise SystemExit(0)

    total_vectors = 0
    t0 = time.time()

    for doc_dir in targets:
        chunk_paths = sorted(doc_dir.glob("chunk_*.txt"))
        if not chunk_paths:
            print(f"[INFO] No chunk files in {doc_dir.name}")
            continue

        # Read all chunks from the current document directory
        records = []
        for cp in chunk_paths:
            obj = parse_header_and_text(cp)
            text = obj["text"]
            meta = obj["meta"]
            if not text:
                continue
            
            # Create a unique ID for each chunk
            cid = f"{doc_dir.name}#{cp.stem}"
            
            # Prepare metadata, including a truncated text preview for Pinecone
            metadata_payload = {
                "url": meta["url"],
                "source": meta["source"],
                "doc_id": doc_dir.name,
                "section": meta["section"],
                "start_char": meta["start_char"],
                "end_char": meta["end_char"],
                "char_len": len(text),
                "text": text[:4000]  # Pinecone metadata has size limits, truncate text
            }
            records.append((cid, text, metadata_payload))

        if not records:
            print(f"[INFO] No eligible chunks found in {doc_dir.name}")
            continue

        # Embed and upsert in batches
        upserted_here = 0
        for batch in chunk_list(records, EMBED_BATCH):
            ids   = [r[0] for r in batch]
            texts = [r[1] for r in batch]
            metas = [r[2] for r in batch]

            # --- CORRECTED EMBEDDING CALL ---
            # Embed in one call with task_type tuned for storing documents for search
            result = genai.embed_content(
                model=EMBED_MODEL,
                content=texts,
                task_type="retrieval_document",  # Use "retrieval_document" for RAG
                output_dimensionality=OUTPUT_DIMENSIONALITY
            )
            embeddings = result['embedding']

            # Prepare vectors for Pinecone upsert
            vectors_to_upsert = []
            for _id, _meta, emb in zip(ids, metas, embeddings):
                vectors_to_upsert.append({"id": _id, "values": emb, "metadata": _meta})

            # Upsert to Pinecone
            for upsert_batch in chunk_list(vectors_to_upsert, UPSERT_BATCH):
                try:
                    index.upsert(vectors=upsert_batch, namespace=NAMESPACE)
                    upserted_here += len(upsert_batch)
                    total_vectors += len(upsert_batch)
                except Exception as e:
                    print(f"An error occurred during Pinecone upsert: {e}")

        print(f"Processed {doc_dir.name}: upserted {upserted_here} vectors to {PINECONE_INDEX}/{NAMESPACE}")

    print(f"\n✅ Done. Upserted a total of {total_vectors} vectors in {time.time() - t0:.1f}s")