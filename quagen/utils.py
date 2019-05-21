import uuid

def generate_id():
    return uuid.uuid4().hex

def chunk_list(a_list, num_chunks):
    num_chunks = max(1, num_chunks)
    return [a_list[i:i + num_chunks] 
            for i in range(0, len(a_list), num_chunks)]