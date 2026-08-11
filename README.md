# newsletter

下载全部文件
``` bash
git clone https://github.com/AlphaNetTeam/newsletter
```

从 github 更新
``` bash
git pull
```

上传 blogs 到服务器
``` bash
# !!!! 先 cd 到 blogs 所在文件夹
scp -r ./blogs/* ubuntu@18.136.207.229:/home/ubuntu/alphanet-new/blog
scp -r ./faq/* ubuntu@18.136.207.229:/home/ubuntu/alphanet-new/faq
```
