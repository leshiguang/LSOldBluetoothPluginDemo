//app.js

//引入插件
import {initManager} from './pages/DeviceMananer';
import {ab2hex, default as ByteUtils, hex2ArrayBuffer} from './pages/ByteUtils';
const lsPlugin = requirePlugin("LSDevicePlugin");

App({
  onLaunch: function() {
    //sdk 初始化
    initManager();
    console.log('onLaunch');
    this.test();
  },
  onShow() {
    //设置登录态
    lsPlugin.login({
      appId: 'wx43b1ab446b5db1e0',
      tenantName: 'tiens', // 租户名称
      tenantId: 8, // 租户id
      subscriptionId: 802, // 订阅id
      associatedId: 'oQYKJs8XzGvcxgRogdasbY4ZzXJ0', // 第三方关联userId
      debug: true, // 打开H5的vconsole
      env: 'online' // 接口环境：beta测试，online生产
    })
  },
  /*
 * 将NSData根据数据长度，转换成NSData 数组
 */
  toArrayWithSize(buffer, packetlength) {
    if (!buffer) {
      return null;
    }
  let dataArray=[];
  //判断NSData长度，根据回包长度，进行分割
  let datalength=buffer.byteLength
  if (datalength > packetlength) {
    let index = 0;
    while (index < datalength - packetlength) {
      let temData=buffer.slice(index,index+packetlength);
      //add list
      dataArray.push(temData);
      //修改索引，取下一组数据
      index = index + packetlength;
    }
    let temData = buffer.slice(index,index+packetlength);
    dataArray.push(temData);
  }
  else {
    dataArray.push(buffer);
  }
  return dataArray;
    return dataArray;
  },
  test() {
    let buff = ByteUtils.hex2ArrayBuffer('00026140');
    let len=610156;
    let crcBufferView = new DataView(buff);
    let size=crcBufferView.getUint32(0,false);
    console.info("size",size);
  },
  //byte数组转字符串
  byteToString: function(arr) {
    if (typeof arr === 'string') {
      return arr;
    }
    var str = '',
        _arr = arr;
    for (var i = 0; i < _arr.length; i++) {
      var one = _arr[i].toString(2),
          v = one.match(/^1+?(?=0)/);
      if (v && one.length == 8) {
        var bytesLength = v[0].length;
        var store = _arr[i].toString(2).slice(7 - bytesLength);
        for (var st = 1; st < bytesLength; st++) {
          store += _arr[st + i].toString(2).slice(2);
        }
        str += String.fromCharCode(parseInt(store, 2));
        i += bytesLength - 1;
      } else {
        str += String.fromCharCode(_arr[i]);
      }
    }
    return str;
  },
});

