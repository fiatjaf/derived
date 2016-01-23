'use strict'

const set = require('set-object-path')
const get = require('get-object-path')
const del = require('del-object-path')

const Derived = require('./derived')

module.exports = class Source {
  constructor (obj) {
    this._raw = obj || {}
    this._derived = {}
  }

  replace (obj) {
    for (let k in this._raw) {
      delete this._raw[k]
      this.changed(k)
    }

    this._raw = obj || {}

    for (let idxName in this._derived) {
      for (let k in this._raw) {
        this.calcDerived(idxName, k)
      }
    }
  }

  keys () {
    return Object.keys(this._raw)
  }

  get (k, d) {
    if (!k) return this._raw
    k = Array.isArray(k) ? k.join('.') : k
    return get(this._raw, k) || d
  }

  set (k, v) {
    k = Array.isArray(k) ? k.join('.') : k
    set(this._raw, k, v)
    this.changed(k)
  }

  del (k) {
    k = Array.isArray(k) ? k.join('.') : k
    del(this._raw, k)
    this.changed(k)
  }

  push (k, v) {
    let tmp = this.get(k, [])
    tmp.push(v)
    this.set(k, tmp)
    this.changed(k)
  }

  derived (idxName, fn) {
    if (!fn && typeof idxName === 'function') {
      fn = idxName
      idxName = Math.random().toString()
    }

    this._derived[idxName] = new Derived(this._raw, idxName, fn)

    for (let k in this._raw) {
      this.calcDerived(idxName, k)
    }

    Object.defineProperty(this, idxName, {
      configurable: false,
      writable: false,
      enumerable: true,
      value: this._derived[idxName]
    })

    return this[idxName]
  }

  changed (k) {
    try {
      k = k.split(/\]|\[|\./)[0]
    } catch (e) {
      k = k[0]
    }
    for (var idxName in this._derived) {
      this.calcDerived(idxName, k)
    }
  }

  calcDerived (idxName, k) {
    let drv = this._derived[idxName]

    drv._clearBySourceKey(k)

    let v = this._raw[k]
    if (v) {
      drv._addNewSource(k, v)
    }
  }
}
