module.exports = {
  "findUsersUrl" : process.env.FIND_USERS_URL,
  "getUserUrl": process.env.GET_USER_URL,
  // 健康状态信息
  "health": {
    "url": process.env.HEALTH_URL || "https://apigw.shec.edu.cn/gateway/interface-sj-ssmjm/getInfo",
    "authoritytype": 2,
    "elementsVersion": "1.00"
  },
  // 获取令牌
  "token":{
    "url": process.env.TOKEN_URL || "https://apigw.shec.edu.cn/gateway/auth/accesstoken/create",
    "appId": process.env.APP_ID,
    "appSecret": process.env.APP_SECRET
  },
  
  // 获取随申码背后的脱敏信息
  "jkm" : {
    "url": process.env.JKM_URL || "https://apigw.shec.edu.cn/gateway/interface-sj-jkmjk/getInfo",
    "authoritytype": 2,
    "elementsVersion": "1.00"
  }, 
  // 核酸检测信息
  "hsjc":{
    "url": process.env.HSJC_URL || "https://apigw.shec.edu.cn/gateway/interface-gj-xgfy-hsjcsjfwjk/getInfo",
    "authoritytype": 2,
    "elementsVersion": "1.00"
  },
  // 疫苗信息
  "yimiao":{
    "url": process.env.YIMIAO_URL || "https://apigw.shec.edu.cn/gateway/interface-gj-xgymjzxx/getInfo",
    "authoritytype": 2,
    "elementsVersion": "1.00"
  },
  
}
