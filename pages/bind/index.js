//获取应用实例
import {
    addDevice,
    addEventListener,
    isBluetoothAvailable,
    removeDevice,
    startDeviceSync,
    stopDeviceSync,
    testSetting,
    bindDevice,
} from '../DeviceMananer';
import { format } from '../ByteUtils';

const app = getApp();

const TEXTS = ['待连接', '连接中...', '底层已连接', '已断开', '协议已连接', '扫描中...', '协议不支持'];
Page({
    data: {
        deviceMac: '',
        deviceName: '',
        statusMsg: '',
        isBluetoothEnable: false,
        gattClient: null,
        logText: '',
        dataPackage: null,
        connectState: 0,
        scanResult: null,
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad: function(options) {
        console.log('onload', JSON.stringify(options));
        let obj = JSON.parse(JSON.stringify(options));
        this.setData({
            deviceMac: obj.broadcastId,
            deviceName: obj.deviceName,
            connectId: obj.connectId,
        });
        let self = this;
        //注册蓝牙连接监听
        addEventListener('bluetoothStateChange', (res) => {
            self.appendLogText(`蓝牙状态发生改变${JSON.stringify(res)}`);
            if (res.available) {
                startDeviceSync();

            }
        });
        //注册设备连接监听
        addEventListener('connectionStateChange', (device) => {
            if (device) {
                self.appendLogText(`bind设备状态改变:${TEXTS[device.status]}${JSON.stringify(device)}`);
                self.updateStatusMessage(TEXTS[device.status]);
                self.setData({ connectState: device.status });
                if (device.status === 6) {
                    this.disconnectDevice();
                    wx.showModal({
                        title: '设备连接失败',
                        showCancel: false,
                        content: '设备协议不支持',
                        success: () => {

                        },
                    });
                }
            }

        });
        //注册数据回调监听
        addEventListener('dataChanged',
            (deviceMac, dataType, data, dataStr) => {
                self.appendLogText(JSON.stringify(data) + '\n' + dataStr);
            });

    },

    /**
     * 生命周期函数--监听页面初次渲染完成
     */
    onReady: function() {
        //判断手机蓝牙是否可用
        if (isBluetoothAvailable()) {
            this.setData({
                isBluetoothEnable: true,
            });
            //连接设备
            this.bindDevice();
        } else {
            //提示打开手机蓝牙
            this.showBlueoothStatus(false);
        }
    },

    /**
     * 生命周期函数--监听页面显示
     */
    onShow: function() {
        this.appendLogText('onShow.......');
        // startDeviceSync()
    },

    /**
     * 生命周期函数--监听页面隐藏
     */
    onHide: function() {
        console.log('onHide.......');

    },

    /**
     * 生命周期函数--监听页面卸载
     */
    onUnload: function() {
        console.log('onUnload.......');
        this.disconnectDevice();
    },

    /**
     * 页面相关事件处理函数--监听用户下拉动作
     */
    onPullDownRefresh: function() {
        console.log('onPullDownRefresh.......');

    },

    /**
     * 页面上拉触底事件的处理函数
     */
    onReachBottom: function() {
        console.log('onReachBottom.......');

    },
    /**
     * 用户点击右上角分享
     */
    onShareAppMessage: function() {
        console.log('onShareAppMessage');
    },

    // 设置
    setup: function() {
        wx.navigateTo({
            url: '../setting/setting?broadcastId=' + this.data.deviceMac +
                '&deviceName=' + this.data.deviceName + '&connectId=' +
                this.data.connectId,
        });
    },
    reconnect: function() {
        startDeviceSync();
        testSetting();

    },
    /**
     * private methods
     */
    //更新界面的提示信息
    updateStatusMessage: function(msg) {
        this.setData({
            statusMsg: msg,
        });
    },

    //发起连接请求
    connectDevice: function() {
        // if (isBluetoothAvailable()) {
        //   this.appendLogText('请打开手机蓝牙');
        //   return;
        // }
        this.setData({
            isConnecting: true,
            connectState: 1,
            logText: '',
        });
        this.appendLogText('发起请求');

        this.updateStatusMessage('Connecting...');
        let mac = this.data.deviceMac;
        if (mac === null || mac === undefined || mac === '') {
            //重置当前mac
            mac = this.data.connectId;
            this.setData({ deviceMac: mac });
        }
        addDevice({
                deviceName: this.data.deviceName,
                deviceMac: mac,
                bluetoothConnectId: this.data.connectId,
            },
            (succeed, msg) => {
                if (!succeed) {
                    let tips = msg;
                    if (typeof msg === 'object') {
                        tips = JSON.stringify(msg);
                    }
                    wx.showModal({
                        title: '添加设备失败',
                        showCancel: false,
                        content: tips,
                        success: () => {
                            wx.navigateBack();
                        },
                    });
                } else {

                }
                //注册数据同步回调
                startDeviceSync();

            });

    },

    bindDevice: function() {
        wx.showLoading({
                title: 'binding...',
                icon: 'loading',
            })
            //建立绑定连接
        let obj = {
            broadcastId: this.data.deviceMac,
            id: this.data.connectId
        }

        let res = {
                onBindingResults: function(res) {
                    console.debug(res.deviceInfo, res.code);
                    wx.hideLoading();
                    wx.showToast({
                        title: '绑定' + res.code + res.deviceInfo
                    })
                },
            }
            //建立绑定连接
        bindDevice(obj, res);
    },

    //断开连接
    disconnectDevice: function() {
        this.setData({
            isConnecting: false,
            connectState: 0,
        });
        this.updateStatusMessage('Disconnect');
        let mac = this.data.deviceMac;
        removeDevice({ deviceMac: mac });
        stopDeviceSync();
    },

    // 打印信息
    appendLogText: function(log) {

        let text = '\n' + format('yyyy-MM-dd hh:mm:ss', new Date().getTime()) +
            ':' + '\n' + log + '\n-------------------';
        this.setData({
            logText: text + this.data.logText,
        });

    },
    // 显示手机当前的蓝牙状态
    showBlueoothStatus: function(enable) {
        if (enable) {
            this.setData({
                isBluetoothEnable: true,
            });
        } else {
            this.setData({
                isBluetoothEnable: false,
                statusMsg: '请打开手机蓝牙',
                isScanning: false,
            });
        }
    },

    /**
     * 蓝牙模块代码
     */
    //  蓝牙状态改变监听
    registerBlueAdapterStatusChanage: function() {

    },

    //停止搜索
    stopSearch: function() {

    },
});