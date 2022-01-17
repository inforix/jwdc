# 数据目录API二次封装

## 说明

本代码为各学校对市大数据中心教委团队提供的数据目录进行二次封装的事例。

## 贡献代码

欢迎大家指出代码问题或者提交自己的贡献。也可以提交自己的请求。

## 部署

### 安装Node.js

#### 下载 Node.js 长期支持版。

从官网（https://nodejs.org/en/download/）上下载Linux Binaries(x64)版本，然后解压。

```bash
tar -xJvf node-v16.13.2.tar.xz -C /usr/local/
```

#### 测试安装是否正常

运行以下命令查看是否正常。

```bash
node -v
npm version
```

### 部署程序代码

将本程序代码复制到 `/opt/jwdc`下，并安装依赖包。

```bash
cd /opt/jwdc
npm i
```

#### 修改 `deploy/centos-ssb.service`中的环境变量。

变量 | 必须设置 | 说明
-- | -- | ----
APP_ID | 是 | 分配的应用ID
APP_SECRET | 是 | 分批的应用密钥
FIND_USERS_URL | 根据需要 | 查找用户的API，用于根据随申码返回的脱敏信息从本地人员库中查找人员
GET_USER_URL | 根据需要 | 根据学工号，查找姓名和身份证件号
HEALTH_URL | 根据需要 | 健康状态，根据数据目录文档设定
JKM_URL | 根据需要 | 扫码识别脱敏信息，根据数据目录文档设定
HSJC_URL | 根据需要 | 核酸检测信息，根据数据目录文档设定
YIMIAO_URL | 根据需要 | 疫苗信息，根据数据目录文档设定


#### 部署ssb服务

然后将`deploy/centos-ssb.service` 复制到 `/lib/systemd/system/` 。


```bash
cp deploy/centos-ssb.service /lib/systemd/system/ssb.service
systemctl daemon-reload
systemctl enable --now ssb.service
```

### 设置防火墙

```bash
firewall-cmd --permanent --add-service=http
firewall-cmd --reload
```

## 支持

本代码适用MIT授权。