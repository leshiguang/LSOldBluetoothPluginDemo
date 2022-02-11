import { ab2hex, formatMapKey } from './ByteUtils';

var LSBluetoothPlugin = requirePlugin('LSDevicePlugin');

let deviceMap = {}; // 用户设备列表

let _connectionStateListener = []; // 连接状态变更回调
let _bluetoothStateListener = []; // 蓝牙状态变更回调
let _dataRevListener = []; //数据回调
let _sportEventListener = []; //运动事件回调

let _bluetoothRebootRestartSyncListener = function(res) {
    //蓝牙可用
    if (isBluetoothAvailable()) {
        //当前工作状态是数据同步(调用过startSync)，防止干扰设备绑定流程,或者没准备好设备同步。
        if (LSBluetoothPlugin.getManagerStatus() ===
            LSBluetoothPlugin.Profiles.WorkStatus.Syncing) {
            console.log('蓝牙重启，自动重连');
            startDeviceSync();
        }
    }
};

/**
 * 蓝牙是否可用
 * @returns {boolean}
 */
export function isBluetoothAvailable() {
    return LSBluetoothPlugin.isBluetoothAvailable();
}

export function startOTA(buffer, callback) {

    console.log('解析前：', new Date().getTime());
    let device = {
        deviceMac: 'F7937EFE37F1', //F7937EFE37F1  EF76D295614C
        bluetoothConnectId: 'E536CDFD-F3FD-0AF3-3B56-510F580008C3',
        //884A187ACB6E","connectId":"88:4A:18:7A:CB:6E
    };

    let upgradeInfo = {
        buffer: buffer,
        checkModel: 'LS413',
    };
    // let worker=new LSBluetoothPlugin.A5UpgradeWorker();
    // worker.test(buffer);

    let ret = LSBluetoothPlugin.startDeviceUpgrade(device, upgradeInfo, (res) => {
        // console.log('OTA res', res);
        callback && callback(res);
    });
    console.log("启动OTA是否成功？", ret);
}
export function stopOTA() {
    LSBluetoothPlugin.stopDeviceUpgrade();
}

/**
 *
 * @param eventName: bluetoothStateChange | connectionStateChange
 * @param listener
 */
export function addEventListener(eventName, listener) {
    if (eventName === 'bluetoothStateChange') {
        _bluetoothStateListener.push(listener);
    } else if (eventName === 'connectionStateChange') {
        _connectionStateListener.push(listener);
    } else if (eventName === 'dataChanged') {
        _dataRevListener.push(listener);
    } else if (eventName === 'sportEvent') {
        _sportEventListener.push(listener);
    } else {
        console.error('[Device Manager] Invalid eventName: ' + eventName);
    }
}

let _syncCallback = {
    onConnectionStateChanged: function(deviceMac, status, type) {
        deviceMac = formatMapKey(deviceMac);
        console.log(
            `[Device Manager] Connection state change: Mac = ${deviceMac} Status = ${status}`);
        console.log('deviceMap:', deviceMap);
        let device = deviceMap[deviceMac.toUpperCase()];
        if (device) {
            device.status = status; // BGattProfiles.DConnectState
        }
        setTimeout(() => {
            //回调给外部增加一个timeout
            _connectionStateListener.forEach(
                listener => listener && listener(device));
        }, 0);
    },
    onUpdateBluetoothConnectId: function(deviceMac, connectId) {},
    onDataChanged: function(deviceMac, dataType, data, dataStr) {
        deviceMac = formatMapKey(deviceMac);
        console.log(deviceMac, dataType, data, dataStr);

        setTimeout(() => {
            //回调给外部增加一个timeout
            _dataRevListener.forEach(
                listener => listener && listener(deviceMac, dataType, data, dataStr));
        }, 0);
        if (dataType === 0) {
            if (deviceMap[deviceMac.toUpperCase()]) {
                deviceMap[deviceMac.toUpperCase()].softwareVersion = data.softwareVersion;
            }
        }
        if (dataType === 1002) {}
        if (dataType === 0x1001) {
            console.log('获取wifi状态');
            setTimeout(() => {
                let setting2 = new LSBluetoothPlugin.SettingProfile.ReqWifiStatus();
                pushSettings(deviceMac, setting2);
                let sett3 = new LSBluetoothPlugin.SettingProfile.ConnectWifi(
                    'B40FB3AFEDE3', '12345678');
                setTimeout(() => {
                    pushSettings(deviceMac, sett3);
                }, 1000);

            }, 1000);

        }
        // 上传数据
        // upload(deviceMap[deviceMac.toUpperCase()], dataType, data);
    },
    OnSportEvent: function(deviceMac, sportType) {
        deviceMac = formatMapKey(deviceMac);
        setTimeout(() => {
            //回调给外部增加一个timeout
            _sportEventListener.forEach(
                listener => listener && listener(deviceMac, sportType));
        }, 0);
    },
};

/**
 * 初始化设备管理
 */
export function initManager(callback) {
    console.log('初始化插件，版本>', LSBluetoothPlugin.getVersion());

    LSBluetoothPlugin.init(callback);
    // LSBluetoothPlugin.openMutualAppProcessor();
    // wx.onAppShow((options) => {
    //   LSBluetoothPlugin.onAppForegroundChange(true);
    // });
    // wx.onAppHide(() => {
    //   LSBluetoothPlugin.onAppForegroundChange(false);
    // });
    LSBluetoothPlugin.initAuthorization({
        appId: 'com.leshiguang.saas.rbac.demo.appid', //乐心分配给平台的appId
    });
    LSBluetoothPlugin.enablePrintConsole(true);
    // LSBluetoothPlugin.setLogInterface(wx.getLogManager());
    if (_bluetoothStateListener.indexOf(_bluetoothRebootRestartSyncListener) ===
        -1) {
        _bluetoothStateListener.push(_bluetoothRebootRestartSyncListener);
    }
    LSBluetoothPlugin.registerBluetoothStateListener([], (res) => {
        _bluetoothStateListener.forEach(listener => listener && listener(res));
    });
    LSBluetoothPlugin.setEventInterface((element_id, deviceId) => {
        console.log('埋点：', element_id, deviceId);
    });
}

/**
 * scanOption = {
 *  broadcastNames: "LS Band 5s", // 蓝牙广播名
 *  callback: function(scanResult) //设备回调
 * }
 */
export function scanDevice(scanOption) {
    console.log('LSBluetoothPlugin', LSBluetoothPlugin);
    LSBluetoothPlugin.stopDataSync('scan to bind device');
    LSBluetoothPlugin.stopScanning(() => {});

    let bns = scanOption.broadcastNames;
    let cb = scanOption.callback;

    let scanCallback = function(res) {
        if (!res || !res.deviceName) return;
        console.log(res);
        if (res.deviceName.indexOf('LS') > -1 || res.deviceName.indexOf('GBF') > -1) {
            cb(res);
        }
        // if (bns) {
        //   if (bns.indexOf(res.deviceName) > -1) {
        //     cb(res); // 根据广播名称过滤
        //   }
        // } else {
        //   cb(res); // 不过滤
        // }
    };
    return LSBluetoothPlugin.startScanning(scanCallback, [LSBluetoothPlugin.Profiles.ScanFilter.Scale]);
}

export function bindDevice(scanResult, callback) {
    LSBluetoothPlugin.stopScanning(() => {});
    LSBluetoothPlugin.stopDataSync('bind device');

    let onBindingListener = {
        //连接状态改变回调
        onConnectionStateChanged(deviceMac, state, type) {

        },
        //绑定操作指令更新回调
        onBindingCommandUpdate(deviceMac, bindCmd, deviceInfo) {
            if (bindCmd === LSBluetoothPlugin.Profiles.BindingCmd.InputRandomNumber) {
                callback.onBindingCommandUpdate({ deviceMac, code: 1, deviceInfo }); // 1是随机码
            } else if (bindCmd ===
                LSBluetoothPlugin.Profiles.BindingCmd.RegisterDeviceID) {
                //deviceInfo
                deviceInfo.mac = deviceMac;
                callback.onBindingCommandUpdate({ deviceMac, code: 2, deviceInfo });
            }
        },
        //绑定结果回调
        onBindingResults(deviceInfo, status) {
            console.log('onBindingResults', deviceInfo, status);
            if (status) { // 绑定成功
                callback.onBindingResults({ deviceInfo, code: 200 });
            } else { // 绑定失败
                callback.onBindingResults({ deviceInfo, code: 500 });
            }
        },
    };

    console.log('开始绑定设备:', scanResult);
    LSBluetoothPlugin.bindDevice(scanResult, onBindingListener);
}

/**
 * 结束扫描
 */
export function stopScan(callback) {
    console.log('[Device Manager] stop scan');
    LSBluetoothPlugin.stopScanning(() => {
        callback && callback();
    });
}

/**
 * 取消绑定
 * @param scanResult
 */
export function cancelDeviceBinding(scanResult) {
    LSBluetoothPlugin.cancelDeviceBinding(scanResult);
}

/**
 * 绑定设备（手环，手表）过程中，输入随机码校验
 * @param deviceMac
 * @param randomNum
 * @param onSettingListener
 */
export function pushSettingsRandomNum(deviceMac, randomNum, onSettingListener) {
    //提示 输入随机数
    let randomNumSett = new LSBluetoothPlugin.SettingProfile.RandomNumSetting(
        randomNum);
    LSBluetoothPlugin.pushSettings(deviceMac, randomNumSett, onSettingListener);
}

/**
 * 绑定设备过程中（互联蓝牙秤），写入设备ID
 * @param deviceMac
 * @param deviceId
 * @param onSettingListener
 */
export function pushSettingsRegisterId(deviceMac, deviceId, onSettingListener) {
    //提示 注册互联秤设备ID
    let idSetting = new LSBluetoothPlugin.SettingProfile.RegisterIdSetting(
        deviceId);
    pushSettings(deviceMac, idSetting, onSettingListener);
}

/**
 * 设置，必须连接上设备，否则会设置失败
 * @param deviceMac
 * @param idSetting
 * @param callback
 */
export function pushSettings(deviceMac, idSetting, callback) {
    const _noneSettingCallback = {
        onFailure: () => {},
        onSuccess: () => {},
    };

    LSBluetoothPlugin.pushSettings(deviceMac, idSetting,
        callback || _noneSettingCallback);
}

/**
 * 开启设备同步
 */
export function startDeviceSync() {

    console.log('[Device Manager] start device data sync',
        LSBluetoothPlugin.isStartSyncing());
    if (LSBluetoothPlugin.isStartSyncing()) {
        LSBluetoothPlugin.startConnectDevice();
    } else {
        LSBluetoothPlugin.startDataSync(_syncCallback);
    }
}

export function stopDeviceSync() {
    LSBluetoothPlugin.stopDataSync('tag');

}

export function testSetting() {

    // let setting = new LSBluetoothPlugin.SettingProfile.ConnectWifi(
    //      'c6:ec:f2:31:49:5b', '88888888');
    let setting = new LSBluetoothPlugin.SettingProfile.ResetA6DeviceId();
    let callbakc = {
        onFailure: (err) => {
            console.log('设置失败' + err);
        },
        onSuccess: (res) => {
            console.log('设置成功' + res);
        },
    }; //c6:ec:f2:31:49:5b
    let device = Object.values(deviceMap)[0];
    console.log('device：', device);
    pushSettings(device.deviceMac, setting, callbakc);
}

/**
 
 * @param device
    {
       deviceMac: 'C9E619F33FEF',
       model: 'LS431-B',
    }
 * @param callback
 */
export function addDevice(device, callback) {

    deviceMap[formatMapKey(device.deviceMac)] = device;
    LSBluetoothPlugin.addDevice(device);
    callback && callback(true, '');
    // LSBluetoothPlugin.addMeasureDevice(device, (res) => {
    //   if (res.code === 200) {
    //     console.log("addMeasureDevice succeed",res)
    //     deviceMap[device.deviceMac] = device;
    //     callback && callback();
    //   } else {
    //     console.log('addMeasureDevice fail', res);
    //     wx.showToast({
    //       title: res.msg, icon: 'none',
    //     });
    //   }
    // });
}

export function removeDevice(device) {
    try {
        delete deviceMap[device.deviceMac];
    } catch (e) {}
    LSBluetoothPlugin.removeDevice(device.deviceMac);
}

export function getDeviceMap() {
    return deviceMap;
}

/**
 * 获取设备电量
 */
export const readDeviceBattery = (deviceMac, cb) => {
    return LSBluetoothPlugin.readDeviceBattery(deviceMac, {
        onBatteryInfo: (deviceMac, status, batteryInfo) => {
            if (status) {
                cb(batteryInfo);
            }
        },
    });
};

export function connectNcpDevice(deviceInfo, callback) {
    LSBluetoothPlugin.connectNcpDevice(deviceInfo, callback);
}

export function disconnectNcpDevice() {
    LSBluetoothPlugin.disconnectNcpDevice();
}