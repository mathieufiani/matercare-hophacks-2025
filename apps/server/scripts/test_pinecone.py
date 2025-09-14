# 01_check_pinecone.py
import os
import time
from dotenv import load_dotenv
from pinecone import Pinecone, ServerlessSpec

load_dotenv()

INDEX_NAME = os.getenv("PINECONE_INDEX")
REGION = os.getenv("PINECONE_REGION")
PINECONE_API_KEY = os.environ.get("PINECONE_API_KEY")
assert PINECONE_API_KEY, "PINECONE_API_KEY missing"

pc = Pinecone(api_key=PINECONE_API_KEY)

# 1) Create the index if needed with correct dims (Gemini text-embedding-004 => 768)
names = [i["name"] for i in pc.list_indexes()]
if INDEX_NAME not in names:
    print(f"Creating index {INDEX_NAME} …")
    pc.create_index(
        name=INDEX_NAME,
        dimension=768,
        metric="cosine",
        spec=ServerlessSpec(cloud="aws", region=REGION),
    )
else:
    print(f"Index already exists: {INDEX_NAME}")


index = pc.Index(INDEX_NAME)
NS = "selftest"

# 3) Upsert a deterministic vector
test_id = "connectivity_check_vec"
vec = [0.001 * (i % 997) for i in range(768)]
print("Upserting test vector…")
index.upsert(vectors=[{"id": test_id, "values": vec, "metadata": {"source":"selftest"}}], namespace=NS)

time.sleep(0.5)

# 4) Fetch by ID (use .vectors on FetchResponse)
print("Fetching by ID to confirm upsert…")
fetched = index.fetch(ids=[test_id], namespace=NS)
if not getattr(fetched, "vectors", None) or test_id not in fetched.vectors:
    # (optional) debug print
    try:
        print("FetchResponse (to_dict):", fetched.to_dict())
    except Exception:
        pass
    raise RuntimeError("Upsert appears to have failed: fetch() did not return the test vector.")

# 5) Query nearest neighbor
print("Querying for nearest neighbor of the same vector…")
res = index.query(vector=vec, top_k=1, include_metadata=True, namespace=NS)
matches = res.matches if hasattr(res, "matches") else res.get("matches", [])
if not matches:
    raise RuntimeError(f"Query returned no matches. Full response: {getattr(res,'to_dict',lambda:res)()}")

m0 = matches[0]
print(f"Top match: id={m0.id if hasattr(m0,'id') else m0.get('id')}  "
      f"score={m0.score if hasattr(m0,'score') else m0.get('score')}  namespace={NS}")

ok = (m0.id == test_id) if hasattr(m0, "id") else (m0.get("id") == test_id)
print("Vector upsert/query test:", "PASS" if ok else "FAIL")

# Cleanup (optional)
try:
    index.delete(ids=[test_id], namespace=NS)
except Exception:
    pass