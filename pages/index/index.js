//index.js
//获取应用实例
import {
    addDevice,
    addEventListener,
    isBluetoothAvailable,
    scanDevice,
    bindDevice,
    stopScan,
    testOTA,
} from '../DeviceMananer';

var LSBluetoothPlugin = requirePlugin('LSDevicePlugin');

const app = getApp();

// 蓝牙连接profiles
var TARGRT_DEVICE_NAME = 'LS Band 5';
var TEST_DEVICE_MAC = 'A4:C1:38:91:55:6E'; //"F2:76:33:C7:35:32";//'A4:C1:38:91:55:6E';//

Page({
    data: {
        statusMsg: '',
        isBluetoothEnable: false,
        isScanning: false,
        isSelected: false,
        isScanCancel: false,
        scanResults: [{
            name: '测试My Mambo',
            broadcastId: 'F2:76:33:C7:35:32',
            connectId: 'F2:76:33:C7:35:32',
        }],
        deviceIds: [], // 扫描到的设备ID列表
        broadcastId: '',
    },
    /**
     * 生命周期函数--监听页面初次渲染完成
     */
    onReady: function() {
        console.log('index.js onReady.......');
        //注册蓝牙状态改变监听
        this.registerBlueAdapterStatusChanage();
        this.startSearch();

    },
    /**
     * 生命周期函数--监听页面隐藏
     */
    onHide: function() {
        console.log('index.js onHide.......');
        this.stopSearch();

    },

    //页面加载
    onLoad: function() {
        console.log('index.js onLoad.......');



    },

    onUnload: function() {
        this.isScanCancel = true;
        //取消蓝牙状态监听回调

    },

    /**
     * page action
     */

    //显示手机当前的蓝牙状态
    showBlueoothStatus: function(enable) {
        if (enable) {
            this.setData({
                isBluetoothEnable: true,
            });
        } else {
            this.setData({
                isBluetoothEnable: false,
                statusMsg: '提示: 请打开手机蓝牙',
                isScanning: false,
            });
        }
    },

    //更新界面的提示信息
    updateStatusMessage: function(msg) {
        this.setData({
            statusMsg: msg,
        });
    },

    //开始搜索
    startSearch: function() {

        this.updateStatusMessage('Scanning...');
        //清除缓存
        this.setData({
            scanResults: [],
            deviceIds: [],
            isScanning: true,
            isScanCancel: false,
        });
        //开启扫描
        let that = this;
        let ret = scanDevice({
            broadcastNames: null,
            callback: (device) => {
                let broadcastId = device.broadcastId;
                if (broadcastId == null) {
                    broadcastId = device.id;
                }
                if (device.services.length === 0) {
                    return;
                }
                let deviceName = device.deviceName;
                let scanResults = that.data.scanResults;
                let deviceIds = that.data.deviceIds;
                if (deviceIds.indexOf(device.id) < 0) {
                    let uuids = device.services.map(
                        (service) => this.logogramUUIDStr(service));
                    deviceIds.push(device.id);
                    scanResults.push({
                        name: deviceName,
                        services: '[' + uuids.join('],[') + ']',
                        broadcastId: broadcastId,
                        connectId: device.id,
                    });
                    that.setData({ scanResults, deviceIds });
                    //更新扫描结果提示
                    that.updateStatusMessage(
                        'Scanning...' + that.data.scanResults.length);
                }
            },
        });
        if (ret !== true) {
            this.showBlueoothStatus(isBluetoothAvailable());
        }
    },
    /**
     * 截取UUID前部的简写名称，转String类型返回
     */
    logogramUUIDStr(uuid) {
        if (!uuid) {
            return 0;
        }
        let index = uuid.indexOf('-');
        if (index === -1 || index - 4 < 0) {
            return 0;
        }
        return uuid.slice(index - 4, index);
    },
    //停止搜索
    stopSearch: function(callback) {
        this.setData({
            scanResults: [],
            isScanning: false,
            isScanCancel: true,
        });
        this.updateStatusMessage('Scanned:' + 0);
        stopScan(callback);
    },

    //扫描结果，目标设备选择
    selectDevice: function(e) {
        console.log('select device', JSON.stringify(e.currentTarget.dataset.text));
        this.setData({
            isSelected: true,
            isScanning: false,
            isScanCancel: true,
        });
        let obj = JSON.parse(JSON.stringify(e.currentTarget.dataset.text));

        // let onBindingListener = {
        //   //连接状态改变回调
        //   onConnectionStateChanged(deviceMac, state, type) {

        //   },
        //   //绑定操作指令更新回调
        //   onBindingCommandUpdate(deviceMac, bindCmd, deviceInfo) {
        //     if (bindCmd === LSBluetoothPlugin.Profiles.BindingCmd.InputRandomNumber) {
        //       console.log("输入随机码", deviceInfo, deviceMac, bindCmd);
        //     } else if (bindCmd ===
        //         LSBluetoothPlugin.Profiles.BindingCmd.RegisterDeviceID) {
        //       //deviceInfo
        //       deviceInfo.mac = deviceMac;

        //     }

        //   },
        //   //绑定结果回调
        //   onBindingResults(deviceInfo, status) {
        //     console.log('onBindingResults', deviceInfo, status);
        //     if (status) { // 绑定成功
        //       console.log("绑定成功", status);
        //       // callback.onBindingResults({deviceInfo, code: 200});
        //     } else {  // 绑定失败
        //       console.log("绑定失败", status);
        //       // callback.onBindingResults({deviceInfo, code: 500});
        //     }
        //   },
        // };

        // bindDevice(obj, onBindingListener);
        this.stopSearch(() => {
            let obj = JSON.parse(JSON.stringify(e.currentTarget.dataset.text));
            let deviceName = obj.name;
            let broadcastId = obj.broadcastId;
            if (deviceName.startsWith('NCP')) {
                wx.showToast({ title: '连接ncp' });
                wx.navigateTo({
                    url: '../ncp/connect?broadcastId=' + broadcastId + '&deviceName=' +
                        deviceName + '&connectId=' + obj.connectId,
                });
            } else {
                wx.navigateTo({
                    url: '../bind/index?broadcastId=' + broadcastId + '&deviceName=' +
                        deviceName + '&connectId=' + obj.connectId,
                });
            }
        });

    },

    inputMacString: function(e) {
        var value = e.detail.value
        this.setData({
            broadcastId: value
        });
        var pos = e.detail.cursor
        var left
        if (pos !== -1) {
            // 光标在中间
            left = e.detail.value.slice(0, pos)
                // 计算光标的位置
            pos = left.replace(/11/g, '2').length
        }

        // 直接返回对象，可以对输入进行过滤处理，同时可以控制光标的位置
        return {
            value: value.replace(/11/g, '2'),
            cursor: pos
        }
    },

    jump: function() {
        var broadcastId = this.data.broadcastId;
        console.log(broadcastId);
        var deviceName = "";
        var connectId = "";
        wx.navigateTo({
            url: '../connect/connect?broadcastId=' + broadcastId + '&deviceName=' + deviceName + '&connectId=' + connectId
        })
    },

    configWifi: function() {

    },

    /**
     * 蓝牙模块代码
     */
    //蓝牙状态改变监听
    registerBlueAdapterStatusChanage: function() {
        addEventListener('bluetoothStateChange', (res) => {
            this.showBlueoothStatus(isBluetoothAvailable());
        });
    },
});