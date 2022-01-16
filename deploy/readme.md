在CentOS上安装


## 安装Node.js

### 下载Node.js长期支持版。

从官网（https://nodejs.org/en/download/）上下载Linux Binaries(x64)版本，然后解压

```bash
tar -xJvf node-v16.13.2.tar.xz -C /usr/local/
```

### 测试安装

运行以下命令查看是否正常。

```bash
node -v
npm version
```

## 部署程序代码

将本程序代码复制到 `/opt/jwdc`下。

### 修改 `deploy/centos-ssb.service`中的环境变量。

### 部署ssb服务

然后将`deploy/centos-ssb.service` 复制到 `/lib/systemd/system/` 。


```bash
cp deploy/centos-ssb.service /lib/systemd/system/ssb.service
systemctl daemon-reload
systemctl enable --now ssb.service
```

## 设置防火墙

```bash
firewall-cmd --permanent --add-service=http
firewall-cmd --reload
```