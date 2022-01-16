'use strict'

const NodeCache = require('node-cache')
const config = require('../config')
const axios = require('axios')
const CryptoJS = require('crypto-js')
const { json } = require('express')
const logger = require('log4js').getLogger('default')

module.exports = class SuiShenMa{
  constructor(){  
    this.tokenCache = new NodeCache()
    this.aes_secret = config.qrcode.aessecret
    this.aes_iv = config.qrcode.aesiv
  }

  async getNewToken(){
    const options = {
      headers: {
        'Content-Type': 'application/json'
      }
    }

    let res = await axios.post(config.qrcode.tokenUrl, {appId: config.qrcode.appId, userName: config.qrcode.userName, password: config.qrcode.password}, options)
    let data = res.data;
    logger.debug(data);
    if(data.code === 200){
      return data.data;
    }

    return null
  }

  async getToken(){
    let token = this.tokenCache.get('token');
    if (token === undefined){
      // get new token
      let ret = await this.getNewToken();
      if(!ret){
        logger.debug('cannot get new token');
        return null;
      }

      let success = this.tokenCache.set('token', ret.accessToken, ret.expiresIn)
      if(!success){
        logger.debug("failed to set token cache'")
      }

      return ret.accessToken
    }

    return token;
  }

  async getJkmInfo(ssmUrl){
    if(!ssmUrl || ssmUrl.length == 0 ){
      return {
        code: 1,
        message: 'no parameter specified'
      }
    }

    var accessToken = await this.getToken()
    if(!accessToken){
      return {
        code: -1,
        messge: 'Cannot get token'
      }
    }

    const options = {
      headers: {
        'Authorization': 'Bearer ' + accessToken
      },
      params: {
        'QRCodeURL' : ssmUrl
      }
    }

    let res = await axios.post(config.qrcode.jkmUrl, null, options)
    logger.log(res.data);
    let data = res.data
    if (data.code != 200){
      return data
    }

    if (data.data.code != '0'){
      return data.data
    }

    let encryptedData = data.data.data
    let decrypt = CryptoJS.AES.decrypt(encryptedData,CryptoJS.enc.Utf8.parse(this.aes_secret),{
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
      iv: CryptoJS.enc.Utf8.parse(this.aes_iv)
    })
    let jsonString = decrypt.toString(CryptoJS.enc.Utf8)

    logger.log(jsonString)
    let ret = JSON.parse(jsonString)
    ret.code = 0
    return ret
    
  }
}

