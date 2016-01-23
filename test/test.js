"use strict"

const expect = require('chai').expect
const D = require('..')

describe('basic', function () {
  describe('derived index', function () {
    var source

    it('should create a new source', function () {
      source = new D({a: 23, b: 12})
      expect(source.get('a')).to.equal(23)
    })

    it('should make a simple derived index', function () {
      source.derived('inverted', (k, v) => [v, k])
      expect(source.inverted.get(12)).to.equal('b')
      expect(source.inverted.keys()).to.include.members([12, 23])
    })

    it('should make a slightly more complex index', function () {
      source = new D()
      source.set('4398756', {name: 'bananas', color: 'yellow'})
      source.set('4985232', {name: 'uvas', color: 'grená'})
      source.derived('byColor', (k, v) => [v.color, v])
      expect(source.byColor.get('yellow')).to.deep.equal({name: 'bananas', color: 'yellow'})
      expect(source.byColor.keys()).to.include.members(['yellow', 'grená'])
    })

    it('the same as above, but without emitting the value', function () {
      source = new D()
      source.set('4398756', {name: 'bananas', color: 'yellow'})
      source.set('4985232', {name: 'uvas', color: 'grená'})
      source.derived('byColor', (k, v) => v.color)
      expect(source.byColor.get('yellow')).to.deep.equal({name: 'bananas', color: 'yellow'})
      expect(source.byColor.keys()).to.include.members(['yellow', 'grená'])
    })

    it('the same as above, but emitting undefined and using getSource', function () {
      source = new D()
      source.set('4398756', {name: 'bananas', color: 'yellow'})
      source.set('4985232', {name: 'uvas', color: 'grená'})
      source.derived('byColor', (k, v) => [v.color])
      expect(source.byColor.getSource('yellow')).to.deep.equal({name: 'bananas', color: 'yellow'})
      expect(source.byColor.keys()).to.include.members(['yellow', 'grená'])
    })

    it('should remove keys from the index when removed from the source', function () {
      source.del('4398756')
      expect(source.byColor.getSource('yellow')).to.not.exist
      expect(source.byColor.keys()).to.include.members(['grená'])
      expect(source.byColor.keys()).to.have.length(1)
    })

    it('should change keys when they\'re changed in the source', function () {
      source.set('4985232', {color: 'grená', time: 'caxias'})
      expect(source.byColor.getSource('grená')).to.deep.equal({
        color: 'grená',
        time: 'caxias'
      })
      expect(source.byColor.keys()).to.include.members(['grená'])
      expect(source.byColor.keys()).to.have.length(1)

      source.set('4985232', {color: 'verde', comida: 'alface'})
      expect(source.byColor.getSource('verde')).to.deep.equal({
        color: 'verde',
        comida: 'alface'
      })
      expect(source.byColor.keys()).to.include.members(['verde'])
      expect(source.byColor.keys()).to.have.length(1)
    })

    it('a complex index, with emit()', function () {
      source = new D({
        '#38972': {
          id: '#38972',
          name: 'almoço',
          comidas: [{
            id: '#84572',
            nome: 'pizza',
            subtipo: 'marinara'
          }]
        },
        '#43987': {
          id: '#43987',
          name: 'janta',
          comidas: [{
            id: '#03813',
            nome: 'água'
          }, {
            id: '#69472',
            nome: 'pão',
            subtipo: 'sovado'
          }]
        }
      })

      let comidas = source.derived('comidas', function (k, v) {
        v.comidas.forEach(comida => {
          this.emit(comida.id, comida)
        })
      })
      expect(source.comidas).to.equal(comidas)

      expect(source.comidas.keys()).to.have.length(3)
      expect(source.comidas.keys()).to.include.members(['#84572', '#03813', '#69472'])
      expect(source.comidas.get('#69472')).to.deep.equal({
        id: '#69472',
        nome: 'pão',
        subtipo: 'sovado'
      })
    })

    it('should get with paths on derived indexes', function () {
      expect(source.comidas.get('#69472[id]')).to.equal('#69472')
      expect(source.comidas.get('#69472.nome')).to.equal('pão')
      expect(source.comidas.get('#69472.ne', 'www')).to.equal('www')
    })

    it('should recalc everything when the function is changed', function () {
      let comidas = source.comidas
      let prevFn = comidas.fn

      source.comidas.fn = function (k, v) {
        v.comidas.forEach(comida => {
          if (comida.subtipo)
            this.emit(comida.nome, comida.subtipo)
        })
      }

      expect(comidas.get('pão')).to.equal('sovado')
      expect(comidas.get('água')).to.not.exit

      comidas.fn = prevFn
    })

    it('should add an remove correctly from the complex index', function () {
      source.set('#43987', {
        id: '#43987',
        name: 'janta',
        comidas: [{
          id: '#03813',
          nome: 'água'
        }, {
          id: '#69472',
          nome: 'pão',
          subtipo: 'sovado'
        }, {
          id: '#98725',
          nome: 'queijo',
          subtipo: 'canastra'
        }]
      })
      expect(source.comidas.keys()).to.have.length(4)
      expect(source.comidas.keys()).to.include.members(['#84572', '#03813', '#69472', '#98725'])

      source.push('#43987.comidas', {id: '#58963', nome: 'pimenta', subtipo: 'calabresa'})
      expect(source.comidas.keys()).to.have.length(5)
      expect(source.comidas.keys()).to.include.members(['#84572', '#03813', '#69472', '#98725', '#58963'])

      source.del('#43987.comidas.3')
      expect(Object.keys(source.comidas)).to.have.length(4)
      expect(source.comidas.keys()).to.include.members(['#84572', '#03813', '#69472', '#98725'])

      source.del('#43987')
      expect(source.comidas.keys()).to.have.length(1)
      expect(source.comidas.keys()).to.include.members(['#84572'])
    })

    it('should error when there is an error on an index function', function () {
      let fn = () => { source.set('#86423', {empty: true}) }
      expect(fn).to.throw()
    })

    it('should return the same values for Object.keys and .keys()', function () {
      expect(source.comidas.keys()).to.deep.equal(Object.keys(source.comidas))
    })

    it('should get keys normally just like if getting with .get(key)', function () {
      expect(source.comidas['#84572']).to.equal(source.comidas.get('#84572'))
    })

    it('should return a list of all keys for .getAll(key)', function () {
      source.set('#43987', {
        id: '#43987',
        name: 'janta',
        comidas: [{
          id: '#03813',
          nome: 'água'
        }, {
          id: '#69472',
          nome: 'pão',
          subtipo: 'sovado'
        }, {
          id: '#98725',
          nome: 'queijo',
          subtipo: 'canastra'
        }]
      })
      source.set('#92386', {
        id: '#92386',
        name: 'café',
        comidas: [{
          id: '#03813',
          nome: 'água',
        }, {
          id: '#69473',
          nome: 'pão',
          subtipo: 'francês'
        }]
      })

      expect(source.comidas.getAll('#03813')).to.deep.equal([{id: '#03813', nome: 'água'}, {id: '#03813', nome: 'água'}])

      source.comidas.fn = function (k, v) {
        (v.comidas || []).forEach(c => this.emit(c.nome, c.subtipo))
      }

      expect(source.comidas.getAll('pão')).to.deep.equal(['sovado', 'francês'])
      expect(source.comidas.getAll('água')).to.deep.equal([undefined, undefined])
      expect(source.comidas.getAll('queijo')).to.deep.equal(['canastra'])
    })

    it('should return the default when .getting unexisting derived keys', function () {
      expect(source.comidas.get('água', 36)).to.equal(36)
    })

    it('the same for .getAllSources(key)', function () {
      expect(source.comidas.getAllSources('água')).to.deep.equal([source.get('#43987'), source.get('#92386')])
    })

    var everythingidx
    it('should work on an index with array keys', function () {
      source = new D({
        1: 'uva',
        2: 'uva',
        3: 'uva',
        4: 'limão',
        5: 'laranja'
      })
      let everything = source.derived((i, name) => [['fruta', name], 1])
      expect(everything.get(['fruta', 'uva'])).to.equal(1)
      everythingidx = everything
    })

    it('should .replace the source contents', function () {
      source.replace({23: 'pêra', 77: 'maçã'})
      expect(everythingidx.get(['fruta', 'uva'])).to.equal(undefined)
      expect(everythingidx.get(['fruta', 'pêra'])).to.equal(1)
    })
  })

  describe('example.js', function () {
    it('runs the example', function () {
      require('../example.js')
    })
  })
})
