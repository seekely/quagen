import uuid

def generate_id():
    return uuid.uuid4().hex

def chunk_list(to_chunk, num_chunks):
    num_chunks = max(1, num_chunks)
    num_chunks = min(num_chunks, len(to_chunk))
    chunks = [[] for i in range(num_chunks)]

    i = 0
    for item in to_chunk:
        chunks[i].append(item)
        i = i + 1 if i < len(chunks) - 1 else 0

    return chunks
