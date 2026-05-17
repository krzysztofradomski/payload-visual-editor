import type { Endpoint, PayloadRequest } from 'payload'

import { collectEditableFields } from '../lib/collectEditableFields.js'
import type { EditableFieldType, VisualEditorFieldsResponse } from '../types.js'

export type VisualEditorPluginState = {
  collections: Set<string>
  editableFieldTypes: readonly EditableFieldType[]
}

export function createFieldsEndpoint(
  pluginState: VisualEditorPluginState,
): Endpoint {
  return {
    method: 'get',
    path: '/visual-editor/fields',
    handler: async (req: PayloadRequest) => {
      const collection = req.query?.collection

      if (typeof collection !== 'string' || !pluginState.collections.has(collection)) {
        return Response.json(
          { error: 'Collection is not enabled for visual editing' },
          { status: 400 },
        )
      }

      const collectionConfig = req.payload.collections[collection]?.config

      if (!collectionConfig) {
        return Response.json({ error: 'Collection not found' }, { status: 404 })
      }

      const fields = collectEditableFields(
        collectionConfig.fields,
        pluginState.editableFieldTypes,
      )

      const body: VisualEditorFieldsResponse = {
        collection,
        fields,
      }

      return Response.json(body)
    },
  }
}
