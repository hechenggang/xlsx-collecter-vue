<script setup lang="ts">

import { h, ref, onMounted, reactive } from 'vue'

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
import type { InternalRowData, TableColumns } from 'naive-ui/lib/data-table/src/interface'

import { sheetApiMethods, apiCode } from "../api/sheetApi";

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
let tableColumns = ref<TableColumns>([])
let visible = ref({
  subUserLoginVisible: false,
  createNewRowDrawerVisible: false,
})
let drawerTitle = ref("")
const TableloadingStatus = ref(false)
const router = useRouter()
const message = useMessage()



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
      const result = sheetApiMethods.sheetSubuserLogin(sheetId, subUser, (ok: boolean) => {
        if (ok) {
          message.success('登录成功')
          visible.value.subUserLoginVisible = false
          handleValidateLoading.value = false

          sheetApiMethods.getSubUserColumns(sheetId, rawColumns, drawerColumns, tableColumns, currentRow, drawerTitle, visible, TableloadingStatus, rawRows)
          sheetApiMethods.getSubUserRows(TableloadingStatus, sheetId, rawRows, visible)
        } else {
          handleValidateLoading.value = false

          message.error('登录失败')
        }
      })

    } else {
      console.log(errors)
      handleValidateLoading.value = false
      message.error('请完善登录信息')
    }
  })
}


function onInsertRowClick() {
  drawerTitle.value = '新增'
  sheetApiMethods.resetCurrentRow(currentRow, rawColumns)
  visible.value.createNewRowDrawerVisible = true
}



const saveRowLoading = ref(false)

function saveRow() {
  saveRowLoading.value = true
  if (drawerTitle.value == '新增') {

    sheetApiMethods.insertRow(sheetId, currentRow, (ok: boolean) => {
      if (ok) {
        message.success('新增成功')
        visible.value.createNewRowDrawerVisible = false
        saveRowLoading.value = false

        sheetApiMethods.getSubUserRows(TableloadingStatus, sheetId, rawRows, visible)
      } else {
        saveRowLoading.value = false
        message.error('新增失败 请联系管理员')
      }
    })
  }

  if (drawerTitle.value == '更新') {
    sheetApiMethods.updateRow(sheetId, currentRow, (ok: boolean) => {
      if (ok) {
        message.success('更新成功')
        visible.value.createNewRowDrawerVisible = false
        saveRowLoading.value = false

        sheetApiMethods.getSubUserRows(TableloadingStatus, sheetId, rawRows, visible)
      } else {
        saveRowLoading.value = false
        message.error('更新失败 请联系管理员')
      }
    })
  }
  console.log("saveRow", currentRow)
}


function logout() {
  sheetApiMethods.resetLoginStatus(visible)
}

onMounted(() => {
  console.log("onMounted")
  sheetApiMethods.checkSheetIdAndApiCode(sheetId, rawColumns, drawerColumns, tableColumns, currentRow, drawerTitle, visible, TableloadingStatus, rawRows)
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
          <n-button @click="onInsertRowClick" strong secondary type="info">新增数据</n-button>
        </n-button-group>

        <n-button-group style="margin-bottom: 12px;">
          <n-button @click="logout" strong secondary type="error">注销 {{ subUser.name() }}</n-button>
        </n-button-group>
      </n-space>

      <n-layout-content v-if="rawRows.length">
        <n-data-table :columns="tableColumns" :data="rawRows" :loading="TableloadingStatus" />
      </n-layout-content>
    </n-layout>
  </n-space>

  <n-drawer v-model:show="visible.createNewRowDrawerVisible" :width="600">
    <n-drawer-content :title="drawerTitle" closable>
      <n-space vertical>
        <n-form-item v-for="column in drawerColumns" :key="column.key + ''" :label="column.title">
          <n-input
            :input-props="{ type: { 'str': 'text', 'int': 'number', 'float': 'number' }[column.type] }"
            v-model:value="currentRow[column.key]"
            type="text"
            :placeholder="column.title"
            clearable
            :title="{ 'str': '请输入文本', 'int': '请输入数字', 'float': '请输入数字' }[column.type]"
          />
        </n-form-item>

        <n-button-group style="margin-bottom: 12px;">
          <n-button
            strong
            secondary
            type="info"
            v-if="drawerTitle == '新增'"
            :loading="saveRowLoading"
            @click="saveRow"
          >新增</n-button>
          <n-button
            strong
            secondary
            type="info"
            v-if="drawerTitle == '更新'"
            :loading="saveRowLoading"
            @click="saveRow"
          >更新</n-button>
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
