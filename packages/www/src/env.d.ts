/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

import type { SubjectPayload } from '@openauthjs/openauth/subject'
import { subjects } from './auth'

interface ImportMetaEnv {
  readonly PUBLIC_API_URL: string
  readonly AIRTABLE_API_KEY: string
  readonly AIRTABLE_BASE_ID: string
  readonly AIRTABLE_TABLE_NAME: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare global {
  declare namespace App {
    interface Locals {
      subject?: SubjectPayload<typeof subjects>
    }
  }
}
