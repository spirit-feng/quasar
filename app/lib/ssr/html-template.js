const compileTemplate = require('lodash.template')
const HtmlWebpackPlugin = require('html-webpack-plugin')

const { fillBaseTag } = require('../webpack/plugin.html-addons')
const { fillPwaTags } = require('../webpack/pwa/plugin.html-pwa')

function injectSsrInterpolation (html) {
  return html
  .replace(
    /(<html[^>]*)(>)/i,
    (found, start, end) => {
      let matches

      matches = found.match(/\sdir\s*=\s*['"]([^'"]*)['"]/i)
      if (matches) {
        start = start.replace(matches[0], '')
      }

      matches = found.match(/\slang\s*=\s*['"]([^'"]*)['"]/i)
      if (matches) {
        start = start.replace(matches[0], '')
      }

      return `${start} {{ _meta.htmlAttrs }}${end}`
    }
  )
  .replace(
    /(<head[^>]*)(>)/i,
    (_, start, end) => `${start}${end}{{ _meta.headTags }}`
  )
  .replace(
    /(<\/head>)/i,
    (_, tag) => `{{ _meta.resourceStyles }}${tag}`
  )
  .replace(
    /(<body[^>]*)(>)/i,
    (found, start, end) => {
      let classes = '{{ _meta.bodyClasses }}'

      const matches = found.match(/\sclass\s*=\s*['"]([^'"]*)['"]/i)

      if (matches) {
        if (matches[1].length > 0) {
          classes += ` ${matches[1]}`
        }
        start = start.replace(matches[0], '')
      }

      return `${start} class="${classes.trim()}" {{ _meta.bodyAttrs }}${end}{{ _meta.bodyTags }}`
    }
  )
  .replace(
    '<div id="q-app"></div>',
    '{{ _meta.resourceApp }}{{ _meta.resourceScripts }}'
  )
}

module.exports.getIndexHtml = function (template, cfg) {
  const compiled = compileTemplate(template)
  let html = compiled(cfg.htmlVariables)

  const data = { bodyTags: [], headTags: [] }

  if (cfg.ctx.mode.pwa) {
    fillPwaTags(data, cfg)
  }

  if (data.bodyTags.length > 0 || data.headTags.length > 0) {
    const htmlCtx = { options: { xhtml: false } }
    html = HtmlWebpackPlugin.prototype.injectAssetsIntoHtml.call(htmlCtx, html, {}, data)
  }

  if (cfg.build.appBase) {
    html = fillBaseTag(html, cfg.build.appBase)
  }

  html = injectSsrInterpolation(html)

  // TODO vue3
  if (cfg.build.minify) {
    const { minify } = require('html-minifier')
    html = minify(html, {
      ...cfg.__html.minifyOptions,
      ignoreCustomFragments: [ /{{ [\s\S]*? }}/ ]
    })
  }

  return compileTemplate(html, { interpolate: /{{([\s\S]+?)}}/g })
}
