// pages/wifiConfig/wifiConfig.js
var LSBluetoothPlugin = requirePlugin("LSDevicePlugin")
//获取应用实例
import {
  addEventListener,
  startDeviceSync
} from "../DeviceMananer";

Page({

  /**
   * 页面的初始数据
   */
  data: {
    deviceMac: '',
    wifiDatas: [{
      ssid: 'woshi'
    },
    {
      ssid: 'nidady'
    }
    ],
    password: '',

  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    let obj = JSON.parse(JSON.stringify(options));
    console.log('参数', obj);
    this.setData({
      deviceMac: obj.broadcastId,
      deviceName: obj.deviceName,
      connectId: obj.connectId
    });
  },

  scanWifi: function () {

    let that = this;
    this.setData({
      wifiDatas: []
    });

    //注册数据回调监听
    addEventListener('dataChanged',
      (deviceMac, dataType, data, dataStr) => {
        // 表示有一个wifi信息更新
        if (dataType == 4096) {
          console.log("apInfo", data);
        } else if (dataType == 4097) {
          console.log("all apInfo", data);
          this.setData({
            wifiDatas: data
          })
        } else if (dataType == 4098) {
          if (data.status == 0) {
            console.log('配网成功');
          } else {
            console.log('配网失败');
          }
        }
        
        else {
          console.error('未处理', data);
        }
      });

    let deviceMac = this.data.deviceMac;
    console.log('scanWifi', deviceMac);
    let onSettingListener = {
      onSuccess() {
        console.log('设置成功');
      }, //设置成功 
      onFailure(msg) {
        console.log('设置失败');
      } //设置失败
    }
    let getWifi = new LSBluetoothPlugin.SettingProfile.ReqScan();

    //push to device
    LSBluetoothPlugin.pushSettings(deviceMac, getWifi, onSettingListener);

  },

  connetWifi: function (event) {
    let obj = JSON.parse(JSON.stringify(event.currentTarget.dataset.text));
    console.warn("connectWifi", obj);

    /// 这里我写死，方便调试
    let connectWifi = new LSBluetoothPlugin.SettingProfile.ConnectWifi(obj.bssid, 'life8511');

    // 成功的回调要看 
    let onSettingListener = {
      onSuccess() {

      }, //设置成功 dataChanged cmd === 4098
      onFailure(msg) {

      } //设置失败
    }
    let deviceMac = this.data.deviceMac;
    LSBluetoothPlugin.pushSettings(deviceMac, connectWifi, onSettingListener);
  },

  inputPassword: function (event) {
    console.log('inputpassword', event.detail.value);
    // this.setData({
    //   password: event.target.value
    // });
  },
  
  reConnect: function() {
    startDeviceSync();
  }


})