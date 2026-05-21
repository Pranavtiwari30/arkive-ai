from db.mongo import documents_col
print("Count:", documents_col.count_documents({}))
for doc in documents_col.find():
    print(doc)
