const SwaggerClient = require("swagger-client");
const fs = require("fs-extra");
const { api } = require("./config");

/** 修改类型 */
const changeType = (value) => {
  if (
    value.type === "integer" ||
    (value.schema && value.schema.type === "integer")
  ) {
    return "number";
  }
  if (value.type === "string") {
    return "string";
  }
  if (value.type === "boolean") {
    return "boolean";
  }
  if (value.type === "array" || value.type === "object") {
    if (value.items) {
      return genInterface(value.items);
    }
    return "";
  }
};

/** 生成注释 */
const genDoc = (value) => `  /** ${value.description} */\n`;

/** 生成返回接口文档 */
const genInterface = (data) => {
  // 需要重新再生成接口的数组
  let subInterface = [];
  // 是否是分页接口
  let str = "";

  const props = data.properties;

  if (
    props &&
    props.hasOwnProperty("pageNumber") &&
    props.hasOwnProperty("pageSize")
  ) {
    // 如果是分页的信息，直接读取里面的
    str += genInterface(props["content"]["items"]);
  } else {
    // 不是分页
    str += `export interface ${data.title} {\n`;
    for (let key in props) {
      // 如果是正常的数据
      str += genDoc(props[key]);
      if (props[key].items) {
        // 不是简单类型 string[]
        if (props[key].items.properties) {
          // 如果有属性，则需要再起生成接口
          // 如果有嵌套
          // 先生成一个占位，在去创建一个接口
          str += `  ${key}:${props[key].items.title};\n`;
          // 暂时存入需要生成接口的数组
          subInterface.push(props[key].items);
        } else {
          str += `  ${key}:${props[key].items.type}[];\n`;
        }
      } else {
        // 是简单类型，没有嵌套 string
        str += `  ${key}:${changeType(props[key])};\n`;
      }
    }
    str += `}\n\r`;
  }

  // 但需要有再次遍历的，需要再次生成接口
  while (subInterface.length) {
    const item = subInterface.pop();
    str += genInterface(item);
  }
  return str;
};

/** 生成参数接口文档 */
const genParamsInterface = (data) => {
  // 需要重新再生成接口的数组
  let subInterface = [];
  let str = "";
  let obj = {};
  // 重新组装数据
  if (Array.isArray(data)) {
    let params;
    // 如果是原始请求
    params = data.filter((item) => item.in != "header");

    params.forEach((item) => {
      obj[item.name] = {
        type: item.type || (item.schema && item.schema.title) || "",
        description: item.description,
        ...item,
      };
    });
  } else {
    obj = data;
  }

  str += `export interface Params {\n`;
  for (let key in obj) {
    str += genDoc(obj[key]);
    // 判断是否是复杂类型
    if (obj[key].schema && obj[key].schema.properties) {
      str += `  ${key}:${obj[key].schema.title};\n`;
      // 暂时存入需要生成接口的数组
      subInterface.push(obj[key].schema.properties);
    } else {
      str += `  ${key}${obj[key].required === false ? "?" : ""}:${changeType(
        obj[key]
      )};\n`;
    }
  }

  str += `}\n\r`;

  // 但需要有再次遍历的，需要再次生成接口
  while (subInterface.length) {
    const item = subInterface.pop();
    str += genParamsInterface(item);
  }
  return str;
};

const getApiData = (json, params) => {
  // if (json.data && json.data.title === "基础分页模型«推文列表返参»") {
  if (json.data) {
    return genParamsInterface(params) + genInterface(json.data);
  }
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

      const params = path[method].parameters;

      let apiTSDoc = getApiData(res, params);

      // if (res.data && res.data.title === "商家端商品详情") {
      if (fs.existsSync(currentApiFilePath)) {
        console.log("该路径已存在");
      } else {
        try {
          console.log("写入文件: ", fileName);
          fs.outputFileSync(fileName, apiTSDoc);
        } catch (error) {
          console.log("error: ", error);
        }
      }
      // }
    }
  }
});
