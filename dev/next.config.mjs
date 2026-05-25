import { withPayload } from '@payloadcms/next/withPayload'
import { fileURLToPath } from 'url'
import path from 'path'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const pluginSrc = path.resolve(dirname, '../src')

// Local dev only: alias the plugin's published subpath imports to source files
// in this repo, so the dev app (and Payload's auto-generated importMap.js) can
// resolve `payload-plugin-visual-editor/{client,rsc}` without the plugin being
// installed as a real node_modules entry. See README "Local development".
const pluginSubpathAliases = {
  'payload-plugin-visual-editor/client': path.resolve(pluginSrc, 'exports/client.ts'),
  'payload-plugin-visual-editor/rsc': path.resolve(pluginSrc, 'exports/rsc.ts'),
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    resolveAlias: pluginSubpathAliases,
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.alias = {
      ...webpackConfig.resolve.alias,
      ...pluginSubpathAliases,
    }

    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  serverExternalPackages: ['mongodb-memory-server'],
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
