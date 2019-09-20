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
    Breaks a list into equally sized chunks. If the list can not be broken
    into equal chunks, the overflowing elements will be evenly distributed.

    Examples:
        chunk_list([5, 5, 2, 3, 5, 7, 9], 2) -> [[5, 5, 2, 9], [3, 5, 7]]
        chunk_list([5, 5, 2, 3, 5, 7, 9], 3) -> [[5, 5, 9], [2, 3], [5, 7]]
        chunk_list([5, 5, 2, 3, 5, 7, 9], 4) -> [[5, 5], [5, 7], [2, 9], [3]]
        chunk_list([5, 5, 2, 3, 5, 7, 9], 5) -> [[5, 7], [5, 9], [2], [3], [5]]

    Args:
        to_chunk (list): Elements to split
        num_chunks (int): Number of chunks

    Returns:
        (list) of to_chunk in num_chunks lists

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
