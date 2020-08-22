# 使用
1. 修改 swagger 文档地址，在 config 中
2. 执行 `node index.js`

# 说明
1. 生成文档在 /api 目录下，按照接口地址生成目录
2. 如果遇到分页，只提取分页里面的信息，即 data.content 中，分页通用 pageNumber 等不提取，自己提取后封装 pagination 的类型
3. 约定分页的格式是
``` yml
code:
data:
  - content // 主要信息
  - pageNumber
  - pageSize
  - totalPages
  - totalRecords
message:
success:
```
4. 非分页信息，格式如下
```yml
code:
data: // 主要信息
message:
success:
```

# 调试
1. 遇到问题，可以在`getApiData`方法，指定某个接口进行调试