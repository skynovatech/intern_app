import ast

for path in [
    "app/services/pdf_service.py",
    "app/routers/applications.py",
    "app/schemas/application.py",
    "app/config.py",
]:
    with open(path, encoding="utf-8") as fh:
        ast.parse(fh.read())
    print("OK", path)
