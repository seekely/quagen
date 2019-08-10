"""
Shared utility functions
"""
import math
import uuid


def generate_id():
    """
    Generates a random uuid
    """
    return uuid.uuid4().hex


def chunk_list(to_chunk, num_chunks):
    """
    Breaks a list into equally sized chunks
    """
    num_chunks = min(num_chunks, len(to_chunk))
    num_chunks = max(1, num_chunks)
    chunk_size = math.floor(len(to_chunk) / num_chunks)
    chunks = [[] for i in range(num_chunks)]

    i = 0
    for item in to_chunk:
        chunks[i].append(item)
        if len(chunks[i]) >= chunk_size:
            i = 0 if i >= len(chunks) - 1 else i + 1

    return chunks
