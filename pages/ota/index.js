// miniprogram/pages/ota/index.js
import {startOTA, stopOTA, testOTA} from '../DeviceMananer';

Page({
  
  /**
   * 页面的初始数据
   */
  data: {
    otaText:'',
    mac:null,
  },
  
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function(options) {
    this.setData({mac: wx.getStorageSync('ota_mac')});
  },
   bindKeyInput: function(e) {
    this.setData({
      mac: e.detail.value
    })
    
  },
  readFile(fileName) {
    let mac = this.data.mac;
    if (!mac && mac.toString().length !== 12) {
      wx.showToast({title:"请输入正确的mac"})
      return;
    }
    mac = mac.toUpperCase();
    wx.setStorageSync('ota_mac', mac);
    wx.getFileSystemManager().readFile({
      filePath: fileName,
      success: res => {
        console.log('读文件成功', res.data.byteLength);
        startOTA(res.data, (res) => {
          this.setData({otaText: JSON.stringify(res)});
        }, mac);//884A187ACB6E
      },
    });
  },
  onClickOTA() {
    //https://sports-qa-files.lifesense.com/firmware/20201019/GBF-2008-BF_JIN_Combine_OTA_V1.4.0.20_ota_dbg_10191036.bin
    let oatFilePath = wx.env.USER_DATA_PATH + '/GBF-2008-BF_JIN_Combine_OTA_V1.4.0.20_ota_dbg_10191036_2.bin';
    let url= 'https://sports-qa-files.lifesense.com/firmware/20201019/GBF-2008-BF_JIN_Combine_OTA_V1.4.0.20_ota_dbg_10191036_2.bin';

    try {
      wx.getFileSystemManager().accessSync(oatFilePath);
      this.readFile(oatFilePath);
    } catch (e) {
      wx.downloadFile({
        url:url,
        success: res => {
          let tempFilePath = res.tempFilePath;
          wx.getFileSystemManager().saveFile({
            tempFilePath: tempFilePath,
            filePath: oatFilePath,
            success: (res) => {
              const savedFilePath = res.savedFilePath;
              console.log('savedFilePath', savedFilePath);
              this.readFile(savedFilePath);
            },
          });
          console.log('tempFilePath:', tempFilePath);
        },
      });
      
    }
  },
  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function() {
  
  },
  
  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function() {
  
  },
  
  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function() {
  
  },
  
  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function() {
    stopOTA();
  },
  
  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function() {
  
  },
  
  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function() {
  
  },
  
  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function() {
  
  },
});