"use strict"

const expect = require('chai').expect
const D = require('..')

describe('basic', function () {
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

  it('the same as above, but emitting undefined', function () {
    source = new D()
    source.set('4398756', {name: 'bananas', color: 'yellow'})
    source.set('4985232', {name: 'uvas', color: 'grená'})
    source.derived('byColor', (k, v) => [v.color])
    expect(source.byColor.getSource('yellow')).to.deep.equal({name: 'bananas', color: 'yellow'})
    expect(source.byColor.keys()).to.include.members(['yellow', 'grená'])
  })

  it('should remove keys from the index when removed from the source', function () {
    source.unset('4398756')
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

    source.derived('comidas', function (k, v) {
      v.comidas.forEach(comida => {
        this.emit(comida.id, comida)
      })
    })

    expect(source.comidas.keys()).to.have.length(3)
    expect(source.comidas.keys()).to.include.members(['#84572', '#03813', '#69472'])
    expect(source.comidas.get('#69472')).to.deep.equal({
      id: '#69472',
      nome: 'pão',
      subtipo: 'sovado'
    })
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

    source.unset('#43987')
    expect(source.comidas.keys()).to.have.length(1)
    expect(source.comidas.keys()).to.include.members(['#84572'])
  })

  it('should error when there is an error on an index function', function () {
    let fn = () => { source.set('#86423', {empty: true}) }
    expect(fn).to.throw()
  })
})
