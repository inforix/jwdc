'use strict'

const config = require('../config')
const axios = require('axios')
const NodeCache = require('node-cache')
const SuiShenMa = require('./suishenma')
const logger = require('log4js').getLogger('default')
const codeTable = require('./code')

const ssm = new SuiShenMa()

// 系统级缓存
const syscache = new NodeCache({
  stdTTL: 24 * 60 * 60 // 24 Hours
})

var cacheUserInfo = {}
// 健康码缓存
const jkCache = new NodeCache({
  stdTTL: 4 * 60 * 60 // 4 hours
});
// 核酸检测缓存
const cacheHsjc = new NodeCache({
  stdTTL: 5*60 // 5 minutes
});
// 疫苗信息缓存
const cacheYimiao = new NodeCache({
  stdTTL: 12 * 60 * 60 // 16 Hours
});

// 健康码和人员对应关系缓存
const cacheJkmUserInfo = new NodeCache({
  stdTTL: 0 // not expire
})

// 身份证照片，永久缓存
const cacheSfzjz = new NodeCache({
  stdTTL: 0
})

/**
 * 获取Access Token，Token 默认有效期为24小时。
 */
async function getAccessToken(){
  let token = syscache.get('access_token');
  if (token !== undefined) {
    logger.debug('found token: ', token);
    return {code: "0", token: token};
  }else{
    logger.debug('not found token, retrieve it from remote');
  }

  const url = config.token.url + '?appId=' + config.token.appId + '&appSecret=' + config.token.appSecret;
  try{
    let res = await axios.get(url);
    let json = res.data;
    logger.debug(json);
    if (json.hasOwnProperty('access_token') ){
      token = json.access_token;
      // Cache it
      syscache.set('access_token', token);
      // return
      return {code: "0", token: token};
    }

    // error occurs
    return json; // such as : {"status":500,"code":"GATEWAY0002","msg":"appId或appSecret错误。"}    
  } catch(err){
    return {code: "-1", message:err.message, err: err};
  }
}

/*
 * 获取用户基本信息
 */
async function getUserInfo(xgh) {
  if (!xgh || xgh.length === 0) {
    return null
  }

  if (cacheUserInfo.hasOwnProperty(xgh)) {
    return cacheUserInfo[xgh]
  }

  const url = config.getUserUrl + encodeURIComponent(xgh);

  try {
    const res = await axios.get(url);
    if (res.data) {
      // cache
      cacheUserInfo[xgh] = res.data
      return res.data;
    } else {
      return null
    }
  } catch (err) {
    return {
      errno: -1,
      err: err
    };
  }
}

/**
 * @param(userInfo) 包含xm,zjhm的JSON对象的字符串
 */
async function findUsers(userInfo) {
  if (!userInfo || userInfo.length < 1) {
    return null
  }

  // let cacheKey = JSON.stringify(userInfo)
  let cacheKey = userInfo

  // Try to find in Cache
  let value = cacheJkmUserInfo.get(cacheKey)
  if (value !== undefined) {
    return value
  }

  try {
    const url = config.findUsersUrl
    const options = {
      'Content-Type': 'application/json'
    }
    const postData = JSON.parse(userInfo)
    let ret = await axios.post(url, postData, options)
    logger.debug(ret)
    // Cache it
    cacheJkmUserInfo.set(cacheKey, ret.data)
    return ret.data
  } catch (err) {
    logger.debug(err)
    return {
      code: "-1",
      message: err.message
    }
  }
}

async function retrieveHealth (xm, zjhm){
  const postData = {
    "XM": xm,
    "ZJHM": zjhm
  }

  const token = await getAccessToken();
  logger.debug('Token: ', token);
  if (token.code !== '0'){
    logger.log('failed to get access token', token.message);
    return token;
  }

  const postOptions = {
    headers: {
      'Content-Type': 'application/json',
      'access_token': token.token,
      'authoritytype': config.health.authoritytype,
      'elementsVersion': config.health.elementsVersion
    },
  }

  logger.log(postOptions);

  try {
    logger.debug('get health');
    let r = await axios.post(config.health.url, postData, postOptions);
    logger.log(r.data)
    const result = r.data
    if (result.code == '0') {
      if (result.data.length > 0) {
        return {
          code: "0",
          type: result.data[0].type
        }
        
      } else {
        return {
          code: "3",
          message: 'Parameter XM and ZJHM does not match'
        }
      }
    } else {
      return result
    }
  } catch (err) {
    return {
      code: "-1",
      message: err.toString()
    }
  }
}

module.exports.getHealth = async function (req, res) {
  let xgh = req.query.xgh
  let xm = req.query.xm
  let zjhm = req.query.zjhm
  if ((!xgh || xgh.length === 0) && (!xm || xm.length === 0 || !zjhm || zjhm.length === 0)) {
    res.json({
      code: "2",
      message: 'Parameter is null'
    })
    return
  }

  if (xgh) {

    let userInfo = await getUserInfo(xgh)
    if (!userInfo || userInfo.errno) {
      res.json({
        code: "3",
        message: 'failed to get  XM, ZJHM'
      })
      return
    }

    logger.log(userInfo);
    xm = userInfo.xm
    zjhm = userInfo.sfzjh
  }

  let cacheKey = xm + '_' + zjhm
  var value = jkCache.get(cacheKey)
  if (value !== undefined) {
    res.json(value);
    return
  }

  let result = await retrieveHealth(xm, zjhm)
  if(result.code === '0'){
    // cache it
    jkCache.set(cacheKey, result)
  }

  res.json(result)

}

async function retrieveHsjc (xm, zjhm){
  // Try to get result
  const postData = {
    "xm": xm,
    "zjhm": zjhm
  }

  const token = await getAccessToken();
  if (token.code !== '0'){
    logger.log('failed to get access token', token.message);
    return token;
  }

  const postOptions = {
    headers: {
      'Content-Type': 'application/json',
      'authoritytype': config.hsjc.authoritytype,
      'elementsVersion': config.hsjc.elementsVersion,
      'access_token': token.token
    },
  }

  logger.debug(postOptions);

  try {
    let r = await axios.post(config.hsjc.url, postData, postOptions);
    logger.debug(r.data)
    const result = r.data
    if (result.code != 200) {
      return {
        code: "-1",
        message: "error occurred",
        data: result
      }
    }

    const resultData = JSON.parse(result.data)
    logger.log(resultData)
    if(resultData.code != '200'){
      return resultData
    }

    if(resultData.data === ""){
      return {
        code: "1",
        message: resultData.message
      }
    }
    
    let value = resultData
    value.code = "0"
    return value
    
  } catch (err) {
    logger.log(err)
    return {
      code: "-1",
      message: err.toString()
    }
  }
}
module.exports.getHsjc = async function (req, res) {
  let xgh = req.query.xgh
  let xm = req.query.xm
  let zjhm = req.query.zjhm
  if ((!xgh || xgh.length === 0) && (!xm || xm.length === 0 || !zjhm || zjhm.length === 0)) {
    res.json({
      code: "2",
      message: 'Parameter is null'
    })
    return
  }

  if (xgh) {
    let userInfo = await getUserInfo(xgh)
    if (!userInfo || userInfo.errno) {
      res.json({
        code: "3",
        message: 'failed to get  XM, ZJHM'
      })
      return
    }

    logger.log(userInfo);
    xm = userInfo.xm
    zjhm = userInfo.sfzjh
  }

  // If cached, get it and return
  let cacheKey = xm + '_' + zjhm
  var value = cacheHsjc.get(cacheKey)
  if (value !== undefined) {
    res.json(value);
    return
  }

  let ret = await retrieveHsjc(xm, zjhm)
  if (ret.code === '0'){
    // Cache it
    cacheHsjc.set(cacheKey, ret)
  }

  res.json(ret);
}

module.exports.getJkmAndHsjc = async function(req, res){
  let xgh = req.query.xgh
  let xm = req.query.xm
  let zjhm = req.query.zjhm
  if ((!xgh || xgh.length === 0) && (!xm || xm.length === 0 || !zjhm || zjhm.length === 0)) {
    res.json({
      code: "2",
      message: 'Parameter is null'
    })
    return
  }

  if (xgh) {
    let userInfo = await getUserInfo(xgh)
    if (!userInfo || userInfo.errno) {
      res.json({
        code: "3",
        message: 'failed to get  XM, ZJHM'
      })
      return
    }

    logger.log(userInfo);
    xm = userInfo.xm
    zjhm = userInfo.sfzjh
  }

  let health = await retrieveHealth(xm, zjhm)
  let hsjc = await retrieveHsjc(xm, zjhm)

  res.json({
    code: '0',
    health: health,
    hsjc: hsjc
  })
}

module.exports.getJkmInfo = async function (req, res) {
  let url = req.query.url
  if (!url || url.length == 0) {
    logger.debug("no parameter specified")
    res.json({
      code: "-1",
      message: "no parameter specified"
    })
    return
  }

  try {
    var start = new Date()
    
    const postData = {
      "data": url,
    }
    logger.debug(postData)
  
    const token = await getAccessToken();
    if (token.code !== '0'){
      logger.log('failed to get access token', token.message);
      return token;
    }

    const postOptions = {
      headers: {
        'Content-Type': 'application/json',
        'authoritytype': config.jkm.authoritytype,
        'elementsVersion': config.jkm.elementsVersion,
        'access_token': token.token
      },
    }
    logger.debug(postOptions)
    // 返回结果事例
    // {
    // "code": "0",
    //  "data": "{\"xm\":\"王玉平\",\"phone\":\"137****3711\",\"type\":\"00\",\"zjhm\":\"370782********1417\",\"dzzz\":\"1\",\"uuid\":\"*****\"}",
    // "message": ""
    // }

    let r = await axios.post(config.jkm.url, postData, postOptions);
    let ret = r.data
    logger.debug(ret)
    if (ret.code != '0') {
      res.json(ret)
      return
    }
    var elapse = new Date() - start
    logger.debug('elapse: ', elapse)
    // ret.data 是JSON对象的字符串
    ret = await findUsers(ret.data)
    if (ret.code != '0') {
      res.json(ret)
    } else {
      let data = ret.data
      if (data.length === 1) {
        res.json({
          code: "0",
          sfzjh: data[0].sfzjh,
          data: data[0],
          elapse: elapse
        })
      } else {
        // check if there are multiple sfzjh
        let arrzjh = []
        data.forEach(function (item) {
          if (arrzjh.indexOf(item.sfzjh) < 0) {
            arrzjh.push(item.sfzjh)
          }
        })

        if (arrzjh.length > 1) {
          res.json({
            code: "2",
            message: 'Found multiple records'
          })
        } else {
          res.json({
            code: "0",
            sfzjh: arrzjh[0],
            data: data,
            elapse: elapse
          })
        }
      }
    }
  } catch (err) {
    logger.debug(err)
    res.json({
      code: "-1",
      message: err.message
    })
  }
}

/**
 * 获取疫苗注射信息
 * @param {string} xm 姓名
 * @param {string} zjhm 证件号码 
 * @returns 
 */
async function retrieveYimiao (xm, zjhm){
  // Try to get result
  const postData = {
    "xm": xm,
    "zjhm": zjhm
  }

  const token = await getAccessToken();
  if (token.code !== '0'){
    logger.log('failed to get access token', token.message);
    return token;
  }

  const postOptions = {
    headers: {
      'Content-Type': 'application/json',
      'authoritytype': config.yimiao.authoritytype,
      'elementsVersion': config.yimiao.elementsVersion,
      'access_token': token.token
    },
  }

  logger.debug(postOptions);

  try {
    let r = await axios.post(config.yimiao.url, postData, postOptions);
    logger.debug(r.data)
    const result = r.data
    if (result.code != 200) {
      return {
        code: "-1",
        message: "error occurred",
        data: result
      }
    }

    const resultData = JSON.parse(result.data)
    logger.log(resultData)
    if(resultData.code != '200'){
      return resultData
    }

    if(resultData.data === ""){
      return {
        code: "1",
        message: resultData.message
      }
    }
    
    let ymxx = JSON.parse(resultData.data);
    ymxx.gaztStr = ymxx.gazt == '01' ? '正常' : '删除';
    ymxx.gjStr = codeTable.getGjxx(ymxx.gj); // 国籍
    ymxx.zjlxStr = codeTable.getZjlx(ymxx.zjlx); // 证件类型
    ymxx.list = JSON.parse(ymxx.jzxxlb); // 注射列表
    ymxx.list.forEach(o=>{
      o.ymmcStr = codeTable.getYmmc(o.ymmc);
      o.scqyStr = codeTable.getYmqy(o.scqy);
      o.jzdStr = codeTable.getXzqh(o.jzd);
    })

    logger.debug(ymxx);
    return ymxx;
    
  } catch (err) {
    logger.log(err)
    return {
      code: "-1",
      message: err.toString()
    }
  }
}
module.exports.getYimiao = async function (req, res) {
  let xgh = req.query.xgh
  let xm = req.query.xm
  let zjhm = req.query.zjhm
  if ((!xgh || xgh.length === 0) && (!xm || xm.length === 0 || !zjhm || zjhm.length === 0)) {
    res.json({
      code: "2",
      message: 'Parameter is null'
    })
    return
  }

  if (xgh) {
    let userInfo = await getUserInfo(xgh)
    if (!userInfo || userInfo.errno) {
      res.json({
        code: "3",
        message: 'failed to get  XM, ZJHM'
      })
      return
    }

    logger.log(userInfo);
    xm = userInfo.xm
    zjhm = userInfo.sfzjh
  }

  // If cached, get it and return
  let cacheKey = xm + '_' + zjhm
  var value = cacheYimiao.get(cacheKey)
  if (value !== undefined) {
    res.json(value);
    return
  }

  let ret = await retrieveYimiao(xm, zjhm)
  if (ret.code === '0'){
    // Cache it
    cacheYimiao.set(cacheKey, ret)
  }

  res.json(ret);
}

