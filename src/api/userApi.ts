
import type { Ref } from 'vue';
import { useRoute } from 'vue-router'
import { backendBaseUri,toString } from "./api";


let apiCode = () => localStorage.getItem("x-api-code") || ""


let userApiUris = {
  "loginByAccount": "https://account.imhcg.cn/to/aae1cf3cb358fab3f0685775655dc000",
  "getUserSheets": "/api/user/sheets",
  "createSheetByXlsx": "/api/sheet/create",
  importSubusersFormXlsx(sheet_id: string|unknown) {
    return `/api/user/${sheet_id}/subusers/import`
  }
}

let userApiMethods = {
  resetLoginStatus() {
    delete localStorage["x-api-code"]
    location.assign(userApiUris.loginByAccount)
  },

  request(method = "GET", url = "http://", body = undefined): Promise<Response> {
    let headers: Record<string, string> = {
      "x-api-code": apiCode() || "apiCode"
    }
    return fetch(url, {
      method: method,
      headers: headers,
      body: body,
      mode: "cors",
    })
  },
  checkLocalApiCode() {
    const route = useRoute()
    if (route.query.code && route.query.code.length === 129) {
      localStorage.setItem("x-api-code", toString(route.query.code))
    } else {
      if (apiCode() == "") {
        location.assign(userApiUris.loginByAccount)
      }
    }
  },
  createSheetByXlsx(body: any, callback: Function) {
    this.request("POST", backendBaseUri + userApiUris.createSheetByXlsx, body).then(
      (resp) => {
        if (resp.status === 200) {
          callback(true)
        } else {
          callback(false)
        }
      }
    )
  },

  createSubUserByXlsx(currentSheet,body: any, callback: Function) {

    this.request("POST", backendBaseUri + userApiUris.importSubusersFormXlsx(currentSheet.id), body).then(
      (resp) => {
        if (resp.status === 200) {
          callback(true)
        } else {
          callback(false)
        }
      }
    )
  },
  getUserSheets(TableloadingStatus,sheets:Ref) {
    TableloadingStatus.value = true
    this.request("GET", backendBaseUri + userApiUris.getUserSheets, undefined).then((resp) => {
      if (resp.status != 200) {
        TableloadingStatus.value = false
        userApiMethods.resetLoginStatus()
        return
      } else {
        resp.json().then((data) => {
          sheets.value = []
          Object.keys(data).forEach((id) => {
            sheets.value.push({
              "id": id,
              "title": data[id]["title"],
              "create_at": data[id]["create_at"]
            })
          })
          TableloadingStatus.value = false
        })
      }

    })
  },
}


export {
    userApiMethods,
    userApiUris
}