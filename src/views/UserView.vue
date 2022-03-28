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

} from 'naive-ui'
import { ArchiveOutline as ArchiveIcon } from '@vicons/ionicons5'
import { useRouter,useRoute } from 'vue-router'
import { computed } from '@vue/reactivity'
import type { List } from 'lodash'

const router = useRouter()


let apiCode = computed(() =>  localStorage.getItem("x-api-code"))
let backendBaseUri = "https://xlsx-collecter-api.imhcg.cn"
let apiUris = {
  "loginByAccount": "https://account.imhcg.cn/to/aae1cf3cb358fab3f0685775655dc000",
  "getUserSheets": "/api/user/sheets",
  "createSheetByXlsx": "/api/sheet/create",
  importSubusersFormXlsx(sheet_id: string) {
    return `/api/user/${sheet_id}/subusers/import`
  }
}
let sheets= ref([])
let currentSheet = ref<Object>({})

let apiMethods = {
    request(method = "GET", url = "http://", body = undefined):Promise<Response> {
      return fetch(url, {
        method: method,
        headers: {
          "x-api-code": apiCode.value
        },
        body: body,
        mode: "cors",
      })
    },
    checkLocalApiCode() {
      const route = useRoute()
      if (route.query.code && route.query.code.length === 129) {
        localStorage.setItem("x-api-code", route.query.code)
      } else {
        if (apiCode.value == undefined) {
          location.assign(apiUris.loginByAccount)
        }
      }
    },
    createSheetByXlsx(body:any, callback:Function) {
      this.request("POST", backendBaseUri + apiUris.createSheetByXlsx, body).then(
        (resp) => {
          if (resp.status === 200) {
            callback(true)
          } else {
            callback(false)
          }
        }
      )
    },
    
    createSubUserByXlsx(body:any, callback:Function) {
      this.request("POST", backendBaseUri + apiUris.importSubusersFormXlsx(currentSheet.id), body).then(
        (resp) => {
          if (resp.status === 200) {
            callback(true)
          } else {
            callback(false)
          }
        }
      )
    },
    getUserSheets() {
      this.request("GET", backendBaseUri + apiUris.getUserSheets, undefined).then((resp) => {
        if (resp.status != 200) {
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
          })
        }

      })
    },
  }



apiMethods.checkLocalApiCode()
apiMethods.getUserSheets()

let createSheetDrawerVisible = ref(false)
let importSubUserDrawerVisible = ref(false)



const columns = [
  {
    title: '名称',
    key: 'title',
    render(row: object) {
      return h(
        NButton,
        {
          strong: true,
          secondary: true,
          size: 'medium',
          type: "info",
          onClick: () => router.push("/sheet?sheet_id=" + row.id)
        },
        { default: () => row.title }
      )
    }
  },
  {
    title: '标识',
    key: 'id'
  },
  {
    title: '创建时间',
    key: 'create_at',
    render(row) {
      return h(
        NTime,
        {
          time: row.create_at,
          format: "yyyy-MM-dd HH:mm:ss",
          // unix: true,
        }
      )
    }
  },
  {
    title: '操作',
    render(row) {
      return h(
        NButton,
        {
          strong: true,
          secondary: true,
          size: 'medium',
          type: "info",
          onClick: () => {
            currentSheet.value = row
            importSubUserDrawerVisible.value = true
          }
        },
        { default: () => "导入数据录入员" }
      )
    }
  }
]

const newSheetTitle = ref("")


const message = useMessage()

function handleFile(file, filelist, e) {
  console.log(newSheetTitle)
  if (newSheetTitle.value == "") {
    message.warning("请填写标题")
    return
  }
  console.log(file, filelist, e)
  var data = new FormData()
  data.append('file', file.file.file)
  data.append('title', newSheetTitle.value)
  apiMethods.createSheetByXlsx(data, (ok:boolean) => {

    if (ok) {
      message.success("新建成功");
      apiMethods.getUserSheets()
      createSheetDrawerVisible.value = !createSheetDrawerVisible.value
    } else {
      message.warning("新建失败 请联系管理员")
      createSheetDrawerVisible.value = !createSheetDrawerVisible.value

    }
  })
}



function handleSubUserFile(file, filelist, e) {

  console.log(file, filelist, e)
  var data = new FormData()
  data.append('file', file.file.file)
  apiMethods.createSubUserByXlsx(data, (ok:boolean) => {
    if (ok) {
      message.success("导入成功");
      importSubUserDrawerVisible.value = false
    } else {
      message.warning("导入失败 请联系管理员")
      importSubUserDrawerVisible.value = false
    }
  })
}


</script>

<template>
  <n-space vertical size="large">
    <n-layout content-style="padding: 24px;">
      <n-button-group style="margin-bottom: 12px;">
        <n-button @click="createSheetDrawerVisible = !createSheetDrawerVisible">新建表单</n-button>
      </n-button-group>

      <n-layout-content>
        <n-data-table :columns="columns" :data="sheets" />
      </n-layout-content>

      <n-drawer v-model:show="createSheetDrawerVisible" :width="600">
        <n-drawer-content title="创建表单" closable>
          <n-space vertical>
            <p>第一步 请输入标题</p>
            <n-input v-model:value="newSheetTitle" type="text" placeholder="输入表单的标题" clearable />
            <p>第二步 请上传制作好的表单模板文件</p>
            <n-upload :on-change="handleFile" :default-upload="false" accept=".xlsx">
              <n-upload-dragger>
                <div style="margin-bottom: 12px">
                  <n-icon size="100" :depth="3">
                    <archive-icon />
                  </n-icon>
                </div>
                <n-text style="font-size: 16px">点击或者拖动文件到该区域来上传</n-text>
              </n-upload-dragger>
            </n-upload>
          </n-space>
        </n-drawer-content>
      </n-drawer>

      <n-drawer v-model:show="importSubUserDrawerVisible" :width="600">
        <n-drawer-content :title="'导入用户至 ' + currentSheet.title" closable>
          <n-space vertical>
            <p>请上传制作好的用户导入模板文件</p>
            <n-upload :on-change="handleSubUserFile" :default-upload="false" accept=".xlsx">
              <n-upload-dragger>
                <div style="margin-bottom: 12px">
                  <n-icon size="100" :depth="3">
                    <archive-icon />
                  </n-icon>
                </div>
                <n-text style="font-size: 16px">点击或者拖动文件到该区域来上传</n-text>
              </n-upload-dragger>
            </n-upload>
          </n-space>
        </n-drawer-content>
      </n-drawer>
    </n-layout>
  </n-space>
</template>

<style >
.n-upload-trigger {
  width: 100%;
}
</style>
