import type { Endpoint, PayloadRequest } from 'payload'

import { collectEditableFields } from '../lib/collectEditableFields.js'
import type {
  EditableFieldDescriptor,
  EditableFieldType,
  VisualEditorCollectionConfig,
} from '../types.js'
import type { VisualEditorFieldsResponse } from '../types.js'

export type VisualEditorPluginState = {
  collections: Map<string, VisualEditorCollectionConfig>
  editableFieldTypes: readonly EditableFieldType[]
}

function filterFieldsForCollection(
  fields: EditableFieldDescriptor[],
  collectionConfig: VisualEditorCollectionConfig,
): EditableFieldDescriptor[] {
  if (collectionConfig === true) {
    return fields
  }

  let filtered = fields

  if (collectionConfig.fields?.length) {
    const allowed = new Set(collectionConfig.fields)
    filtered = filtered.filter((field) => allowed.has(field.path))
  }

  if (collectionConfig.excludeFields?.length) {
    const excluded = new Set(collectionConfig.excludeFields)
    filtered = filtered.filter((field) => !excluded.has(field.path))
  }

  return filtered
}

export function createFieldsEndpoint(
  pluginState: VisualEditorPluginState,
): Endpoint {
  return {
    method: 'get',
    path: '/visual-editor/fields',
    handler: async (req: PayloadRequest) => {
      const collection = req.query?.collection

      if (typeof collection !== 'string') {
        return Response.json({ error: 'Collection slug is required' }, { status: 400 })
      }

      const collectionConfig = pluginState.collections.get(collection)

      if (!collectionConfig) {
        return Response.json(
          { error: 'Collection is not enabled for visual editing' },
          { status: 400 },
        )
      }

      const collectionSchema = req.payload.collections[collection]?.config

      if (!collectionSchema) {
        return Response.json({ error: 'Collection not found' }, { status: 404 })
      }

      const fields = filterFieldsForCollection(
        collectEditableFields(collectionSchema.fields, pluginState.editableFieldTypes),
        collectionConfig,
      )

      const body: VisualEditorFieldsResponse = {
        collection,
        fields,
      }

      return Response.json(body)
    },
  }
}
