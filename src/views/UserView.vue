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
import { computed, reactive } from '@vue/reactivity'
import type { InternalRowData, TableColumns } from 'naive-ui/lib/data-table/src/interface'
import type { FileInfo } from 'naive-ui/lib/upload/src/interface'
import { toString } from '../api/api'
import { userApiMethods } from '../api/userApi'


const router = useRouter()
let currentSheet = ref<InternalRowData>({})
let sheets = ref<Record<string, string>[]>([])
const TableloadingStatus = ref(false)
let createSheetDrawerVisible = ref(false)
let importSubUserDrawerVisible = ref(false)


const tableColumns: TableColumns = [
  {
    title: '名称',
    key: 'title',
    render(rowData: InternalRowData, rowIndex: number) {
      return h(
        NButton,
        {
          strong: true,
          secondary: true,
          size: 'medium',
          type: "info",
          onClick: () => router.push("/sheet?sheet_id=" + rowData.id)
        },
        { default: () => rowData.title }
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
    render(rowData: InternalRowData, rowIndex: number) {
      return h(
        NTime,
        {
          type: "datetime",
          time: rowData.create_at as number,
          format: "yyyy-MM-dd HH:mm:ss",
          // unix: true,
        }
      )
    }
  },
  {
    title: '操作',
    key: "操作",
    render(rowData: InternalRowData, rowIndex: number) {
      return h(
        NButton,
        {
          strong: true,
          secondary: true,
          size: 'medium',
          type: "info",
          onClick: () => {
            currentSheet.value = rowData
            console.log(currentSheet)
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

interface handleFile {
  file: FileInfo;
  fileList: FileInfo[];
  event: ProgressEvent | Event | undefined;
}

function handleFile(dataIncome: handleFile) {
  let file = dataIncome.file
  console.log(newSheetTitle)
  if (newSheetTitle.value == "") {
    message.warning("请填写标题")
    return
  }
  console.log(file)
  var data = new FormData()
  data.append('file', file?.file as Blob)
  data.append('title', newSheetTitle.value)
  userApiMethods.createSheetByXlsx(data, (ok: boolean) => {

    if (ok) {
      message.success("新建成功");
      userApiMethods.getUserSheets(TableloadingStatus, sheets)
      createSheetDrawerVisible.value = !createSheetDrawerVisible.value
    } else {
      message.warning("新建失败 请联系管理员")
      createSheetDrawerVisible.value = !createSheetDrawerVisible.value

    }
  })
  return true
}



function handleSubUserFile(dataIncome: handleFile) {
  let file = dataIncome.file
  console.log(file)
  var data = new FormData()
  data.append('file', file?.file as Blob)
  userApiMethods.createSubUserByXlsx(currentSheet.value, data, (ok: boolean) => {
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
  userApiMethods.checkLocalApiCode()
  userApiMethods.getUserSheets(TableloadingStatus, sheets)
})

</script>

<template>
  <n-space vertical size="large">
    <n-layout content-style="padding: 24px;">
      <n-button-group style="margin-bottom: 12px;">
        <n-button @click="createSheetDrawerVisible = !createSheetDrawerVisible">新建表单</n-button>
      </n-button-group>

      <n-layout-content v-if="sheets.length">
        <n-data-table :columns="tableColumns" :data="sheets" :loading="TableloadingStatus" />
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
