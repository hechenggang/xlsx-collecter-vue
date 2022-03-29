<script setup lang="ts">

import { h, ref, onMounted } from 'vue'

import {
  NButton,
  NLayout,
  NLayoutContent,
  NLayoutFooter,
  NLayoutHeader,
  NDataTable,
  NSpace,
  NButtonGroup,
  NxButton,
  NDrawer,
  NDrawerContent,
  NInput,
  NUploadDragger,
  NUpload,
  NText,
  NIcon,
  NMessageProvider,
  useMessage,
  NTime,
  NCard,
  NModal,
  NForm,
  NFormItem,
} from 'naive-ui'

import type { FormInst } from 'naive-ui'

import { ArchiveOutline as ArchiveIcon } from '@vicons/ionicons5'
import { useRouter, useRoute } from 'vue-router'


const backendBaseUri = "https://xlsx-collecter-api.imhcg.cn"
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

  updateRowToDb(sheet_id: string, row_id: string) {
    return `/api/sheet/${sheet_id}/row/${row_id}/update`
  },
  deleteRowFromDb(sheet_id: string, row_id: string) {
    return `/api/sheet/${sheet_id}/row/${row_id}/delete`
  },
  outputToXlsxFile(sheet_id: string, row_id: string) {
    return `/api/sheet/${sheet_id}/rows/${row_id}/xlsx`
  }

}

let sheetId = ref("")
let subUser = ref({
  account: "",
  password: "",
  name: () => localStorage.getItem("name"),
})

let currentRows = ref([])
let rawRows = ref([])
let rawColumns = ref([])
let currentRow = ref<Record<string, string>>({})
let drawerColumns = ref<Record<string, string>[]>([])
let tableColumns = ref<Record<string, string>[]>([])
let visible = ref({
  subUserLoginVisible: false,
  createNewRowDrawerVisible: false,
})

let drawerTitle = ref("")

const router = useRouter()
const message = useMessage()

let apiCode = () => localStorage.getItem("x-api-subuser-code") || ""

// 把一个值转为字符串，显得没有那么多类型错误
function toString<T>(raw: T): string {
  return String(raw)
}


let apiMethods = {

  request(method: string = "GET", url: string = "http://", body: any = undefined, content_type: string = "application/json") {
    let headers: Record<string, string> = {
      "x-api-code": apiCode(),
      "content-type": content_type
    }

    return fetch(url, {
      method: method,
      headers: headers,
      body: body,
      mode: "cors",
    })
  },
  resetLoginStatus() {
    delete localStorage["x-api-subuser-code"]
    delete localStorage["name"]
    visible.value.subUserLoginVisible = true
  },

  checkSheetIdAndApiCode() {
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
      apiMethods.getSubUserColumns()
      apiMethods.getSubUserRows()
    }
  },
  sheetSubuserLogin(callback: Function) {

    apiMethods.request("POST", backendBaseUri + uri.login(sheetId.value), JSON.stringify({ "account": subUser.value.account, "password": subUser.value.password }), "application/json").then((resp) => {
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


  getSubUserRows() {
    apiMethods.request("GET", backendBaseUri + uri.getRowsFromDb(sheetId.value), undefined).then((resp) => {
      if (resp.status != 200) {
        apiMethods.resetLoginStatus()
        return
      } else {
        resp.json().then((data) => {
          console.log("getSubUserRows", data)
          rawRows.value = data
        })
      }
    })
  },


  resetCurrentRow() {
    // 深拷贝一份当前行
    let copyCurrentRow = JSON.parse(JSON.stringify(currentRow.value || {}));
    Object.keys(rawColumns).forEach((key) => {
      // 初始化当前行
      copyCurrentRow[key] = ""
    })
    currentRow.value = copyCurrentRow
    console.log("resetCurrentRow", currentRow)
  },

  getSubUserColumns() {
    apiMethods.request("GET", backendBaseUri + uri.getSheetColumns(sheetId.value), undefined).then((resp) => {
      if (resp.status != 200) {
        this.resetLoginStatus()
        return
      } else {
        resp.json().then((data) => {
          // console.log(data)
          // 保存字段数据
          rawColumns = data

          // 整理原始字段为 naive-ui Table 接受的字段 
          let temp: any[] = []
          Object.keys(data).forEach((key) => {
            temp.push({
              "key": key,
              "title": data[key]["name"]
            })
          })
          // 在增加操作按钮前,把字段给与抽屉字段
          drawerColumns.value = temp.slice()
          // 增加编辑按钮
          const vnode = {
            title: '操作',
            render(row: Record<string, string>) {

              let btns: any[] = []
              const editButton = h(
                NButton,
                {
                  strong: true,
                  secondary: true,
                  type: "info",
                  onClick: () => {
                    console.log("更新", row, this)
                    currentRow.value = row
                    drawerTitle.value = "更新"
                    visible.value.createNewRowDrawerVisible = true
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
                    console.log("删除", row)
                    currentRow.value = row

                    const ok = confirm("确认删除吗?")
                    if (ok) {
                      apiMethods.deleteRow((ok: boolean) => {
                        if (!ok) {
                          alert("删除失败 请联系管理员")
                        } else {
                          apiMethods.getSubUserRows()
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
                    console.log("导出", row)
                    currentRow.value = row

                    // const ok = confirm("确认删除吗?")

                    apiMethods.outputToXlsxFile()

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



  insertRow(callback: Function) {

    apiMethods.request("POST", backendBaseUri + uri.insertRowToDb(sheetId.value), JSON.stringify(currentRow.value), "application/json").then((resp) => {
      if (resp.status == 200) {
        callback(true)
      } else {
        callback(false)
      }
    })
  },

  updateRow(callback: Function) {

    apiMethods.request("POST", backendBaseUri + uri.updateRowToDb(sheetId.value, currentRow.value.rowid), JSON.stringify(currentRow.value), "application/json").then((resp) => {
      if (resp.status == 200) {
        callback(true)
      } else {
        callback(false)
      }
    })
  },



  deleteRow(callback: Function) {
    apiMethods.request("POST", backendBaseUri + uri.deleteRowFromDb(sheetId.value, currentRow.value.rowid), undefined, "application/json").then((resp) => {
      if (resp.status == 200) {
        callback(true)
      } else {
        callback(false)
      }
    })
  },

  outputToXlsxFile() {
    apiMethods.request("GET", backendBaseUri + uri.outputToXlsxFile(sheetId.value, currentRow.value.rowid), undefined, "application/json").then((resp) => {
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





const rules = {
  account: {
    required: true,
    message: '请输入用户名',
    trigger: 'blur'
  },
  password: {
    required: true,
    message: '请输入密码',
    trigger: ['input', 'blur']
  }
}

const formRef = ref<FormInst | null>(null)

const handleValidateLoading = ref(false)
function handleValidateClick(e: MouseEvent) {
  e.preventDefault()
  handleValidateLoading.value = true
  formRef.value?.validate((errors) => {
    if (!errors) {
      console.log("尝试登录")
      const result = apiMethods.sheetSubuserLogin((ok: boolean) => {
        if (ok) {
          message.success('登录成功')
          visible.value.subUserLoginVisible = false
          handleValidateLoading.value = false

          apiMethods.getSubUserColumns()
          apiMethods.getSubUserRows()
        } else {
          handleValidateLoading.value = false

          message.error('登录失败')
        }
      })


    } else {
      console.log(errors)
      message.error('请完善登录信息')
    }
  })
}

const saveRowLoading = ref(false)

function saveRow() {
  saveRowLoading.value = true
  if (drawerTitle.value == '新增') {

    apiMethods.insertRow((ok: boolean) => {
      if (ok) {
        message.success('新增成功')
        visible.value.createNewRowDrawerVisible = false
        saveRowLoading.value = false

        apiMethods.getSubUserRows()
      } else {
        saveRowLoading.value = false
        message.error('新增失败 请联系管理员')
      }
    })
  }

  if (drawerTitle.value == '更新') {
    apiMethods.updateRow((ok: boolean) => {
      if (ok) {
        message.success('更新成功')
        visible.value.createNewRowDrawerVisible = false
        saveRowLoading.value = false

        apiMethods.getSubUserRows()
      } else {
        saveRowLoading.value = false
        message.error('更新失败 请联系管理员')
      }
    })
  }
  console.log("saveRow", currentRow)
}

onMounted(() => {
  console.log("onMounted")
  apiMethods.checkSheetIdAndApiCode()
})


</script>

<template>
  <n-modal
    v-model:show="visible.subUserLoginVisible"
    :mask-closable="false"
    :close-on-esc="false"
    auto-focus
  >
    <n-card
      style="width: 600px"
      title="需要登录"
      :bordered="true"
      size="huge"
      role="dialog"
      aria-modal="true"
    >
      <n-form ref="formRef" inline :label-width="80" :model="subUser" :rules="rules" size="medium">
        <n-form-item label="用户名" path="account">
          <n-input v-model:value="subUser.account" placeholder="输入账号" />
        </n-form-item>
        <n-form-item label="密码" path="password">
          <n-input v-model:value="subUser.password" placeholder="输入密码" />
        </n-form-item>

        <n-form-item>
          <n-button
            attr-type="button"
            :loading="handleValidateLoading"
            @click="handleValidateClick"
          >验证</n-button>
        </n-form-item>
      </n-form>
    </n-card>
  </n-modal>

  <n-space vertical size="large" v-if="apiCode()">
    <n-layout content-style="padding: 24px;">
      <n-space justify="space-between">
        <n-button-group style="margin-bottom: 12px;">
          <n-button
            @click="drawerTitle = '新增', apiMethods.resetCurrentRow(), visible.createNewRowDrawerVisible = true"
          >新增数据</n-button>
        </n-button-group>

        <n-button-group style="margin-bottom: 12px;">
          <n-button @click="apiMethods.resetLoginStatus">注销 {{ subUser.name() }}</n-button>
        </n-button-group>
      </n-space>

      <n-layout-content>
        <n-data-table :columns="tableColumns" :data="rawRows" />
      </n-layout-content>
    </n-layout>
  </n-space>

  <n-drawer v-model:show="visible.createNewRowDrawerVisible" :width="600">
    <n-drawer-content :title="drawerTitle" closable>
      <n-space vertical>
        <n-form-item v-for="column in drawerColumns" :key="column.key + ''" :label="column.title">
          <n-input
            v-model:value="currentRow[column.key]"
            type="text"
            :placeholder="column.title"
            clearable
          />
        </n-form-item>

        <n-button-group style="margin-bottom: 12px;">
          <n-button v-if="drawerTitle == '新增'" :loading="saveRowLoading" @click="saveRow">新增</n-button>

          <n-button v-if="drawerTitle == '更新'"  :loading="saveRowLoading"  @click="saveRow">更新</n-button>
        </n-button-group>
      </n-space>
    </n-drawer-content>
  </n-drawer>
</template>

<style >
.n-upload-trigger {
  width: 100%;
}
</style>
