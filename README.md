Objects with derived indexes!

[![Build Status](https://travis-ci.org/fiatjaf/derived.svg?branch=master)](https://travis-ci.org/fiatjaf/derived)
[![NPM Link](https://nodei.co/npm/derived.png)](https://npmjs.com/derived)

## What does it do?

It creates automatic, synchronous and always-updated "views" for your data. You instantiate a main data object and define functions for creating derived indexes on it. Later you can easily access the data on the derived indexes.

It reduces bloat, verbose value getters and automatizes data organization in the context of your app. Perhaps [others](http://www.taffydb.com/) would call this "a database". This name would be misleading, but the power of automatic synchronous subindexes cannot be overstated.

## Example

(view and fiddle with this example on [Tonic](https://tonicdev.com/npm/derived))

```javascript
const assert = require('chai').assert
const D = require('derived')

/* instantiate your data fundamentals -- or just begin from zero with `new D()` */
const data = new D({
  '#1': {
    name: 'shangri-la',
    zipcode: 27498,
    inhabitants: [{
      name: 'catherine',
      birthday: '11-17'
    }]
  },
  '#2': {
    name: 'el dorado',
    zipcode: 69712,
    inhabitants: [{
      name: 'pizarro',
      birthday: '04-01'
    }]
  },
  '#3': {
    name: 'atlantis',
    zipcode: 18315,
    inhabitants: [{
      name: 'plato',
      birthday: '07-18'
    }]
  },
  '#4': {
    name: 'avalon',
    zipcode: 37851,
  }
})

/* reindex the data on the go, for much faster and easy access later */
data.derived('cityId', (k, v) => [v.name, k])

/* now you can access it easily, no need for costly searches on independent index management */
assert.equal(data.cityId['shangri-la'], '#1')

/* add data using super useful methods (you can't use normal methods, it's a Javascript limitation) */
let cityId = data.cityId
data.push(`${cityId['avalon']}.inhabitants`, {name: 'arthur', birthday: '12-30'})
data.push(`${cityId['avalon']}.inhabitants`, {name: 'morgana', birthday: '12-31'})

/* create multiple derived indexes */
data.derived('personZip', function (cityId, cityData) {
  if (cityData.inhabitants) {
    cityData.inhabitants.forEach(person => {
      this.emit(person.name, cityData.zipcode)
    })
  }
})

/* no more `var personZip = zipcodesIndex[personsIndex[personId]]` or other verbose tricks
   access your data directly */
let personzip = data.personZip
assert.equal(personzip['catherine'], 27498)
assert.equal(personzip['arthur'], 37851)
assert.equal(personzip['morgana'], 37851)

/* indexes can be of anything: */
data.derived('birthdaysByMonth', function (_, city) {
  if (city.inhabitants) {
    city.inhabitants.forEach(person => {
      let month = parseInt(person.birthday.split('-')[0])
      this.emit(month, person.name)
    })
  }
})
assert.deepEqual(data.birthdaysByMonth.getAll(12), ['arthur', 'morgana'])

/* everything changes synchronously and automatically whenever you update the main data source */
data.set(`${cityId['atlantis']}.inhabitants.0.birthday`, '01-01')
assert.equal(data.birthdaysByMonth[1], 'plato')
```

## Other

* The derivation functions are inspired by [CouchDB](http://docs.couchdb.org/en/1.6.1/). Not equal, though, but the `emit` thing... well, it doesn't matter.
* The cool setters (`.set`, `.push` etc.) are powered by [object-path](https://www.npmjs.com/package/object-path). There are many more: `.get` with default value, `.insert`, `.del`, `.has`, `.empty`. Their meanings should be straightforward, but please check their documentation for more information.
* These getters and setters only work on the main data source, the data in derived indexes is read-only and can be accessed through normal Javascript syntax.
* Other features are planned (please say what would you find more useful):
  * immutable main data source
  * immutable derived indexes
  * queryable derived indexes, returning arrays of values sorted by emitted keys
  * derived indexes based on the entire data object, instead of in each of its keys
  * leveled derived indexes
