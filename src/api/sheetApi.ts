
import type { Ref } from 'vue';
import { useRoute } from 'vue-router'
import { backendBaseUri, toString } from "./api";

import {
  NButton,
  NTime,
} from 'naive-ui'

import { h } from "vue";
import type { InternalRowData } from 'naive-ui/lib/data-table/src/interface';


let apiCode = () => localStorage.getItem("x-api-subuser-code") || ""



const uri = {
  login(sheet_id: string) {
    return `/api/user/${sheet_id}/subuser/login`
  },
  getSheetColumns(sheet_id: string) {
    return `/api/sheet/${sheet_id}/columns`
  },
  getRowsFromDb(sheet_id: string) {
    return `/api/sheet/${sheet_id}/rows`
  },
  insertRowToDb(sheet_id: string) {
    return `/api/sheet/${sheet_id}/row/insert`
  },

  updateRowToDb(sheet_id: string, row_id: string | unknown) {
    return `/api/sheet/${sheet_id}/row/${row_id}/update`
  },
  deleteRowFromDb(sheet_id: string, row_id: string | unknown) {
    return `/api/sheet/${sheet_id}/row/${row_id}/delete`
  },
  outputToXlsxFile(sheet_id: string, row_id: string | unknown) {
    return `/api/sheet/${sheet_id}/rows/${row_id}/xlsx`
  }

}

let sheetApiMethods = {

  request(method: string = "GET", url: string = "http://", body: any = undefined, content_type: string = "application/json") {
    let headers: Record<string, string> = {
      "x-api-subuser-code": apiCode(),
      "content-type": content_type
    }

    return fetch(url, {
      method: method,
      headers: headers,
      body: body,
      mode: "cors",
    })
  },
  resetLoginStatus(visible: Ref) {
    delete localStorage["x-api-subuser-code"]
    delete localStorage["name"]
    visible.value.subUserLoginVisible = true
  },

  checkSheetIdAndApiCode(sheetId: Ref, rawColumns: Ref, drawerColumns: Ref, tableColumns: Ref, currentRow: Ref, drawerTitle: Ref, visible: Ref, TableloadingStatus: Ref, rawRows: Ref) {
    const route = useRoute()
    if (route.query.sheet_id && route.query.sheet_id.length == 32) {
      sheetId.value = toString(route.query.sheet_id)
      console.log("checkSheetIdAndApiCode", sheetId)
    } else {
      location.assign("/")
    }
    if (!apiCode) {
      visible.value.subUserLoginVisible = true
    } else {
      sheetApiMethods.getSubUserColumns(sheetId, rawColumns, drawerColumns, tableColumns, currentRow, drawerTitle, visible, TableloadingStatus, rawRows)
      sheetApiMethods.getSubUserRows(TableloadingStatus, sheetId, rawRows, visible)
    }
  },

  sheetSubuserLogin(sheetId: Ref, subUser: Ref, callback: Function) {
    sheetApiMethods.request("POST", backendBaseUri + uri.login(sheetId.value), JSON.stringify({ "account": subUser.value.account, "password": subUser.value.password }), "application/json").then((resp) => {
      if (resp.status == 200) {
        return resp.json().then((data) => {
          console.log("sheetSubuserLogin", data)
          localStorage.setItem("x-api-subuser-code", data["x-api-subuser-code"])
          localStorage.setItem("name", data["name"])
          callback(true)
        })
      } else {
        callback(false)
      }
    })
  },


  getSubUserRows(TableloadingStatus: Ref, sheetId: Ref, rawRows: Ref, visible: Ref) {
    TableloadingStatus.value = true
    sheetApiMethods.request("GET", backendBaseUri + uri.getRowsFromDb(sheetId.value), undefined).then((resp) => {
      if (resp.status != 200) {
        TableloadingStatus.value = false
        sheetApiMethods.resetLoginStatus(visible)
        return
      } else {
        resp.json().then((data) => {
          console.log("getSubUserRows", data)
          rawRows.value = data
          TableloadingStatus.value = false
        })
      }
    })
  },


  resetCurrentRow(currentRow: Ref, rawColumns: Ref) {
    // 深拷贝一份当前行
    Object.keys(rawColumns.value).forEach((key) => {
      // 初始化当前行
      currentRow.value[key] = ""
    })
    console.log("resetCurrentRow", currentRow)
  },

  // 更新数据弹出之前，先把当前行数据装进  currentRow
  fillCurrentRow(currentRow: Ref, rawColumns: Ref, rowData: InternalRowData) {
    // 深拷贝一份当前行
    Object.keys(rowData).forEach((key) => {
      // 初始化当前行
      currentRow.value[key] = rowData[key]
    })
    console.log("resetCurrentRow", currentRow)
  },

  getSubUserColumns(sheetId: Ref, rawColumns: Ref, drawerColumns: Ref, tableColumns: Ref, currentRow: Ref, drawerTitle: Ref, visible: Ref, TableloadingStatus: Ref, rawRows: Ref) {
    sheetApiMethods.request("GET", backendBaseUri + uri.getSheetColumns(sheetId.value), undefined).then((resp) => {
      if (resp.status != 200) {
        sheetApiMethods.resetLoginStatus(visible)
        return
      } else {
        resp.json().then((data) => {
          // console.log(data)
          // 保存字段数据
          rawColumns.value = data

          // 整理原始字段为 naive-ui Table 接受的字段
          // temp 装着 key 和 title 字段，用于 naiveui 生成表头
          let temp: any[] = []
          // temp2 多一个 type 字段，用于弹出框内的输入校验

          let temp2: any[] = []
          Object.keys(data).forEach((key) => {
            temp.push({
              "key": key,
              "title": data[key]["name"],

            })
            temp2.push({
              "key": key,
              "title": data[key]["name"],
              "type": data[key]["type"],
            })

          })
          // 在增加操作按钮前,把字段给与抽屉字段
          drawerColumns.value = temp2
          // 增加编辑按钮
          const vnode = {
            title: '操作',
            render(rowData: InternalRowData) {

              let btns: any[] = []
              const editButton = h(
                NButton,
                {
                  strong: true,
                  secondary: true,
                  type: "info",
                  onClick: () => {
                    console.log("加载 rowData", rowData, "-> currentRow", currentRow)
                    // currentRow.value = rowData
                    sheetApiMethods.fillCurrentRow(currentRow, rawColumns, rowData)
                    drawerTitle.value = "更新"
                    visible.value.createNewRowDrawerVisible = true
                    // console.log("更新后 currentRow",currentRow)
                  }
                },
                { default: () => "修改" }
              )
              const deleteButton = h(
                NButton,
                {
                  strong: true,
                  secondary: true,
                  type: "info",
                  style: "margin-left:5px;",
                  onClick: () => {
                    console.log("删除", rowData)
                    currentRow.value = rowData

                    const ok = confirm("确认删除吗?")
                    if (ok) {
                      sheetApiMethods.deleteRow(sheetId, currentRow, (ok: boolean) => {
                        if (!ok) {
                          alert("删除失败 请联系管理员")
                        } else {
                          sheetApiMethods.getSubUserRows(TableloadingStatus, sheetId, rawRows, visible)
                        }
                      })
                    }
                  }
                },

                { default: () => "删除" }
              )

              const outputXlsxButton = h(
                NButton,
                {
                  strong: true,
                  secondary: true,
                  type: "info",
                  style: "margin-left:5px;",
                  onClick: () => {
                    console.log("导出", rowData)
                    currentRow.value = rowData
                    sheetApiMethods.outputToXlsxFile(sheetId, currentRow)
                  }
                },

                { default: () => "To Xlsx" }
              )

              btns.push([editButton, deleteButton, outputXlsxButton])
              return btns
            }
          }

          temp.push(vnode)
          tableColumns.value = temp
          console.log("tableColumns", tableColumns)
        })
      }
    })
  },



  insertRow(sheetId: Ref, currentRow: Ref, callback: Function) {

    sheetApiMethods.request("POST", backendBaseUri + uri.insertRowToDb(sheetId.value), JSON.stringify(currentRow.value), "application/json").then((resp) => {
      if (resp.status == 200) {
        callback(true)
      } else {
        callback(false)
      }
    })
  },

  updateRow(sheetId: Ref, currentRow: Ref, callback: Function) {

    sheetApiMethods.request("POST", backendBaseUri + uri.updateRowToDb(sheetId.value, currentRow.value.rowid), JSON.stringify(currentRow.value), "application/json").then((resp) => {
      if (resp.status == 200) {
        callback(true)
      } else {
        callback(false)
      }
    })
  },



  deleteRow(sheetId: Ref, currentRow: Ref, callback: Function) {
    sheetApiMethods.request("POST", backendBaseUri + uri.deleteRowFromDb(sheetId.value, currentRow.value.rowid), undefined, "application/json").then((resp) => {
      if (resp.status == 200) {
        callback(true)
      } else {
        callback(false)
      }
    })
  },

  outputToXlsxFile(sheetId: Ref, currentRow: Ref,) {
    sheetApiMethods.request("GET", backendBaseUri + uri.outputToXlsxFile(sheetId.value, currentRow.value.rowid), undefined, "application/json").then((resp) => {
      if (resp.status == 200) {
        // let blob = new Blob([resp.blob()], {type: resp.headers["content-type"]});
        resp.blob().then((blob) => {
          let objectUrl = URL.createObjectURL(blob);
          let link = document.createElement('a');
          link.style.display = "none";
          link.href = objectUrl;
          link.download = '导出数据-' + currentRow.value[Object.keys(currentRow.value)[1]] + '.xlsx';
          link.click();
          URL.revokeObjectURL(objectUrl);
          document.body.removeChild(link);
        })

      }
    })
  },


}




export {
  sheetApiMethods,
  apiCode
}