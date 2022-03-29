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
  NTable,
  NCard,

} from 'naive-ui'
import { ArchiveOutline as ArchiveIcon } from '@vicons/ionicons5'
import { useRouter, useRoute } from 'vue-router'
import { computed } from '@vue/reactivity'

const router = useRouter()


let apiCode = () => localStorage.getItem("x-api-code") || ""
let backendBaseUri = "https://xlsx-collecter-api.imhcg.cn"
let apiUris = {
  "loginByAccount": "https://account.imhcg.cn/to/aae1cf3cb358fab3f0685775655dc000",
  "getUserSheets": "/api/user/sheets",
  "createSheetByXlsx": "/api/sheet/create",
  importSubusersFormXlsx(sheet_id: string) {
    return `/api/user/${sheet_id}/subusers/import`
  }
}
let currentSheet = ref<Record<string, string>>({})

let sheets = ref<Record<string, string>[]>([])

// 把一个值转为字符串，显得没有那么多类型错误
function toString<T>(raw: T): string {
  return String(raw)
}

const TableloadingStatus = ref(false)

let apiMethods = {
  resetLoginStatus() {
    delete localStorage["x-api-code"]
    location.assign(apiUris.loginByAccount)
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
        location.assign(apiUris.loginByAccount)
      }
    }
  },
  createSheetByXlsx(body: any, callback: Function) {
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

  createSubUserByXlsx(body: any, callback: Function) {

    this.request("POST", backendBaseUri + apiUris.importSubusersFormXlsx(currentSheet.value.id), body).then(
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
    TableloadingStatus.value = true
    this.request("GET", backendBaseUri + apiUris.getUserSheets, undefined).then((resp) => {
      if (resp.status != 200) {
        TableloadingStatus.value = false
        apiMethods.resetLoginStatus()
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





let createSheetDrawerVisible = ref(false)
let importSubUserDrawerVisible = ref(false)



const columns = [
  {
    title: '名称',
    key: 'title',
    render(row: Record<string, string>) {
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
  apiMethods.createSheetByXlsx(data, (ok: boolean) => {

    if (ok) {
      message.success("新建成功");
      apiMethods.getUserSheets()
      createSheetDrawerVisible.value = !createSheetDrawerVisible.value
    } else {
      message.warning("新建失败 请联系管理员")
      createSheetDrawerVisible.value = !createSheetDrawerVisible.value

    }
  })
  return true
}



function handleSubUserFile(file, filelist, e) {

  console.log(file, filelist, e)
  var data = new FormData()
  data.append('file', file.file.file)
  apiMethods.createSubUserByXlsx(data, (ok: boolean) => {
    if (ok) {
      message.success("导入成功");
      importSubUserDrawerVisible.value = false
    } else {
      message.warning("导入失败 请联系管理员")
      importSubUserDrawerVisible.value = false
    }
  })
}



onMounted(() => {
  console.log("UserView onMounted")
  apiMethods.checkLocalApiCode()
  apiMethods.getUserSheets()
})

</script>

<template>
  <n-space vertical size="large">
    <n-layout content-style="padding: 24px;">
      <n-button-group style="margin-bottom: 12px;">
        <n-button @click="createSheetDrawerVisible = !createSheetDrawerVisible">新建表单</n-button>
      </n-button-group>

      <n-layout-content v-if="sheets.length">
        <n-data-table :columns="columns" :data="sheets" :loading="TableloadingStatus" />
      </n-layout-content>

      <n-drawer v-model:show="createSheetDrawerVisible" :width="600">
        <n-drawer-content title="创建表单" closable>
          <n-space vertical>
            <p>请输入表单的标题</p>
            <n-input v-model:value="newSheetTitle" type="text" placeholder="输入表单的标题" clearable />
            <p>请上传制作好的表单模板文件</p>
            <n-upload :on-change="handleFile" :default-upload="false" accept=".xlsx">
              <n-upload-dragger>
                <div style="margin-bottom: 12px">
                  <n-icon size="100" :depth="3">
                    <archive-icon />
                  </n-icon>
                </div>
                <n-text style="font-size: 16px">
                  点击这里然后选择模板文件，或者拖动模板文件到这里
                  <br />即可自动上传并完成此表单的创建
                </n-text>
              </n-upload-dragger>
            </n-upload>

            <n-card>
              第一步，你需要先下载模板，
              <n-button
                text
                tag="a"
                href="../assets/示例-信息采集表.xlsx"
                target="_blank"
                type="primary"
              >点此下载模板</n-button>。
              <br />第二步，使用形如
              <code>input:int->B3</code>的数据标签来标记你需要采集的数据。
              这里的
              <code>input:</code>是固定开头。
              <code>int->B3</code>说明这里需要一个
              <code>int</code>类型的数据，
              并且这个数据指向
              <code>B3</code>这个格子。
              <br />举个例子，你有一个表格，需要填很多信息。
              里面有一个格子叫做
              <code>姓名</code>，姓名位于
              <code>B3</code>，
              姓名的旁边是填写姓名的空格，你只需要在这个空格里填上
              <code>input:str->B3</code>即可。
              <br />这样，系统就可以知道，这个格子需要填写，
              并且填写的东西与
              <code>B3</code>也就是
              <code>姓名</code>关联。
              这里的
              <code>str</code> 意思是文本型，因为
              <code>姓名</code>是文字。
              同类的标签还有
              <code>int 整数、float 小数</code>。
              <br />第三步，在此页面点击下面的上传按钮，上传你编辑好的模板。
              完成上传后，你就可以在网页上完成数据的采集，而不是通过 Excel。
              <br />
            </n-card>
          </n-space>
        </n-drawer-content>
      </n-drawer>

      <n-drawer v-model:show="importSubUserDrawerVisible" :width="600">
        <n-drawer-content :title="'导入用户至 ' + currentSheet.title" closable>
          <n-space vertical>
            

            <n-upload :on-change="handleSubUserFile" :default-upload="false" accept=".xlsx">
              <n-upload-dragger>
                <div style="margin-bottom: 12px">
                  <n-icon size="100" :depth="3">
                    <archive-icon />
                  </n-icon>
                </div>
                <n-text style="font-size: 16px">
                  点击这里然后选择模板文件，或者拖动模板文件到这里
                  <br />即可自动上传并完成此表单用户的导入
                </n-text>
              </n-upload-dragger>
            </n-upload>
            <n-card>
              第一步，你需要先下载模板，
              <n-button
                text
                tag="a"
                href="../assets/示例-子用户导入.xlsx"
                target="_blank"
                type="primary"
              >点此下载模板</n-button>。
              <br />第二步，从模板的第二行开始，逐行填入用户名和密码，最后记得保存模板。
              <br />第三步，在此页面点击下面的上传按钮，上传你编辑好的模板。
              只有你上传的用户，才能登录到这个表单。
              <br />
            </n-card>
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
code {
  padding: 0 5px;
  background-color: antiquewhite;
}
</style>
