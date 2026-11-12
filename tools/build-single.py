#!/usr/bin/env python3
"""把 index.html 及其引用的 css/js 合并成一个单文件（用于离线发送或私有预览）。
用法：python3 tools/build-single.py 输出文件.html"""
import re,sys,os
root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
h=open(os.path.join(root,'index.html'),encoding='utf-8').read()
rd=lambda p:open(os.path.join(root,p.split('?')[0]),encoding='utf-8').read()
h=re.sub(r'<link rel="stylesheet" href="(assets/[^"]+)">',lambda m:'<style>\n'+rd(m.group(1))+'</style>',h)
h=re.sub(r'<script src="(assets/[^"]+)"></script>',lambda m:'<script>\n'+rd(m.group(1))+'</script>',h)
assert '="assets/' not in h
open(sys.argv[1],'w',encoding='utf-8').write(h)
print('written',sys.argv[1],len(h.encode()),'bytes')
