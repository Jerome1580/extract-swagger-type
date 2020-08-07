const SwaggerClient = require("swagger-client");
const Mock = require("mockjs");
const PeakMock = require("peak-mock");
const fs = require("fs-extra");
const path = require("path");

const api = "http://master.jobs2020.cj.com/api/v2/api-docs";

// interface IDetail {
//   amount:number;
//   commissionAmount:number
// }

// 生成 type 类型
// const genType = data => {
//   let str = '';

//   for (let key of data){
//     let value = data[key];
//     // key => amount
//     // value  =>  { type:'integer'}

//     console.log('value.items: ', value.items);
//     if(value.type === 'integer'){
//       str += `${key}:number`
//     }
//     if(value.type === 'string'){
//       str += `${key}:string`
//     }
//     if(value.type === 'array'){
//       console.log('value.items: ', value.items);
//       str += genType(value.items)
//       str += `${key}:${value.items.type}[]`
//     }
//     if(value.type === 'boolean'){
//       str += `${key}:boolean`
//     }

//   }
//   return str

// }

/** 修改类型 */
const changeType = (value) => {
  if (value.type === "integer") {
    return "number";
  }
  if (value.type === "string") {
    return "string";
  }
  if (value.type === "boolean") {
    return "boolean";
  }
  if (value.type === "array" || value.type === "object") {
    return changeTypeArr(value);
  }
};

/** 修改type 类型 Arr */
const changeTypeArr = (value) => {
  let str = "";
  if (value.items) {
    str += genInterface(value.items);
  }
  return str;
};

/** 生成注释 */
const genDoc = (value) => `\xa0\xa0/** ${value.description} */\n`;

/** 生成接口文档 */
const genInterface = (data) => {
  // 需要重新再生成接口的数组
  let subInterface = [];
  // 是否是分页接口
  let isPagination = false;
  let str = "";

  const props = data.properties;


  str += `interface ${data.title} {\n`;
  for (let key in props) {
    if (key === "content") {
      // 如果是分页的信息，直接读取里面的
      // 清空 str
      str = "";
      str += changeTypeArr(props[key]);
      isPagination = true;
      break;
    } else {
      // 如果是正常的数据
      str += genDoc(props[key]);
      if (props[key].items) {
        // 判断是否是简单类型 string[]
        if (props[key].items.properties) {
          // 如果有属性，则需要再起生成接口
          // 如果有嵌套
          // 先生成一个占位，在去创建一个接口
          str += `\xa0\xa0${key}:${props[key].items.title};\n`;
          // 暂时存入需要生成接口的数组
          subInterface.push(props[key].items);
        } else {
          str += `\xa0\xa0${key}:${props[key].items.type}[];\n`;
        }
      } else {
        // 没有嵌套
        str += `\xa0\xa0${key}:${changeType(props[key])};\n`;
      }
    }
  }

  // 如果不是分页接口
  // 分页接口不要 }
  if (!isPagination) {
    str += `}\n\r`;
  }

  // 但需要有再次遍历的，需要再次生成接口
  while (subInterface.length) {
    const item = subInterface.pop();
    str += genInterface(item);
  }
  return str;
};

const getApiData = (json, fileName) => {
  // if (json.data && json.data.title === "商家端商品详情") {
    if(json.data){
      return genInterface(json.data);
    }
  // }

  // accountBalance:{
  //   type: "integer",
  //   format: "int32",
  //   description: "账号余额",
  // }
  //
  //  interface 商家端商品详情 {
  /** 账号余额 */
  //  accountBalance:number;
  /** 已提现 */
  //   cashed:number;
  // }

  // if(json.data && json.data.items){
  //   console.log('json: ', json);
  //   num ++
  // }
};

// 写入文件

SwaggerClient(api).then((res) => {
  const paths = res.spec.paths; // 路径
  const api = {};
  const baseUrl = res.spec.basePath.split("-")[0];

  for (let key of Object.keys(paths)) {
    const path = paths[key]; // http://master.jobs2020.cj.com/api/v2/api-docs

    for (let method of Object.keys(path)) {
      const ok = path[method].responses["200"];
      // 得到的结果
      const res = (ok.schema && ok.schema.properties) || {};
      // 创建文件名
      const fileName = `${baseUrl}${key}`.slice(1) + ".d.ts";
      // 放入文件名路径
      const currentApiFilePath = fileName;

      let apiTSDoc = getApiData(res);

      // if (res.data && res.data.title === "商家端商品详情") {
        if (fs.existsSync(currentApiFilePath)) {
          console.log("该路径已存在");
        } else {
          try {
            console.log('fileName: ', fileName);
            fs.outputFileSync(fileName, apiTSDoc);
          } catch (error) {
            console.log("error: ", error);
          }
        }
      // }

    }
  }
});
