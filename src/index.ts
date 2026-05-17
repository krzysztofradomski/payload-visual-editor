import type { Config, Plugin } from 'payload'

import { createFieldsEndpoint, type VisualEditorPluginState } from './endpoints/fieldsHandler.js'
import {
  DEFAULT_EDITABLE_FIELD_TYPES,
  type EditableFieldType,
  type PayloadVisualEditorConfig,
} from './types.js'

export type { EditableFieldType, PayloadVisualEditorConfig } from './types.js'
export { DEFAULT_EDITABLE_FIELD_TYPES } from './types.js'

const pluginState: VisualEditorPluginState = {
  collections: new Set(),
  editableFieldTypes: DEFAULT_EDITABLE_FIELD_TYPES,
}

const VISUAL_EDITOR_BRIDGE_PATH = 'payload-visual-editor/client#VisualEditorBridge'

function enableCollectionVisualEditor(
  collection: NonNullable<Config['collections']>[number],
): void {
  collection.admin = collection.admin || {}
  collection.admin.components = collection.admin.components || {}
  collection.admin.components.edit = collection.admin.components.edit || {}

  const existing = collection.admin.components.edit.beforeDocumentControls || []

  if (
    !existing.some(
      (component) =>
        (typeof component === 'string' && component === VISUAL_EDITOR_BRIDGE_PATH) ||
        (typeof component === 'object' &&
          component !== null &&
          'path' in component &&
          component.path === VISUAL_EDITOR_BRIDGE_PATH),
    )
  ) {
    collection.admin.components.edit.beforeDocumentControls = [
      ...existing,
      VISUAL_EDITOR_BRIDGE_PATH,
    ]
  }
}

export const payloadVisualEditor =
  (pluginOptions: PayloadVisualEditorConfig): Plugin =>
  (incomingConfig: Config): Config => {
    const editableFieldTypes: readonly EditableFieldType[] =
      pluginOptions.editableFieldTypes ?? DEFAULT_EDITABLE_FIELD_TYPES

    pluginState.editableFieldTypes = editableFieldTypes
    pluginState.collections = new Set(
      Object.entries(pluginOptions.collections ?? {})
        .filter(([, enabled]) => enabled)
        .map(([slug]) => slug),
    )

    const config: Config = {
      ...incomingConfig,
      collections: [...(incomingConfig.collections || [])],
      endpoints: [...(incomingConfig.endpoints || [])],
    }

    if (config.collections) {
      for (const collection of config.collections) {
        if (pluginState.collections.has(collection.slug)) {
          enableCollectionVisualEditor(collection)
        }
      }
    }

    if (!config.endpoints) {
      config.endpoints = []
    }

    config.endpoints.push(createFieldsEndpoint(pluginState))

    if (pluginOptions.disabled) {
      return config
    }

    return config
  }
