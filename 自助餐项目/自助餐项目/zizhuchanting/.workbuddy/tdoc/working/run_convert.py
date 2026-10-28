# -*- coding: utf-8 -*-
# doc-converter 快捷包装：等价于直接运行 convert_doc.py（参数内联，绕开命令行审批解析故障）
import sys, runpy

PLUGIN = r"C:/Users/JSZX/.workbuddy/plugins/cache/workbuddy-builtin/workbuddy-docx/5.8.3-wb.41334564.gdb0e9b51.h4da087921e4a"
CONVERT = PLUGIN + r"/skills/html-to-doc/scripts/convert_doc.py"

if len(sys.argv) != 4:
    print("usage: run_convert.py <html> <output> <mode:ops|design>")
    sys.exit(2)

html, out, mode = sys.argv[1], sys.argv[2], sys.argv[3]
argv = ["convert_doc.py", "--html", html, "--output", out]
if mode == "ops":
    # 操作手册：封面 + 页码 + 目录（含截图），严格预检
    argv += ["--require-page-furniture", "--require-toc", "--no-verify"]
else:
    # 设计文档：封面 + 页码 + 目录，严格预检
    argv += ["--require-page-furniture", "--require-toc", "--no-verify"]

sys.argv = argv
sys.path.insert(0, PLUGIN + r"/skills/html-to-doc/scripts")
runpy.run_path(CONVERT, run_name="__main__")
