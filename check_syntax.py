import ast
import sys

files = [
    r"backend/app/main.py",
    r"backend/app/routers/status.py",
    r"backend/app/routers/applications.py",
    r"backend/app/routers/communication.py",
    r"backend/app/routers/lookups.py",
    r"backend/app/routers/settings.py",
    r"backend/app/routers/admin_users.py",
    r"backend/app/routers/jobs.py",
    r"backend/app/services/job_queue.py",
    r"backend/app/services/settings_service.py",
    r"backend/app/services/lookup_service.py",
    r"backend/app/models/app_setting.py",
    r"backend/app/models/lookup_item.py",
    r"backend/app/models/job.py",
    r"backend/app/utils/rate_limiter.py",
    r"backend/app/schemas/lookups.py",
    r"backend/app/schemas/settings.py",
    r"backend/app/schemas/admin.py",
    r"backend/app/schemas/job.py",
    r"backend/app/services/notification_service.py",
    r"backend/app/services/reminder_service.py",
]

bad = 0
for f in files:
    try:
        with open(f, encoding="utf-8") as fh:
            ast.parse(fh.read(), filename=f)
        print("OK", f)
    except SyntaxError as e:
        bad = 1
        print("SYNTAX_ERR", f, e.msg, "line", e.lineno)

print("RESULT", "FAIL" if bad else "ALL_OK")
sys.exit(1 if bad else 0)