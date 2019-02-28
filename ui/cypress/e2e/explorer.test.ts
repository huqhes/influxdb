import {Doc} from 'codemirror'
import {FROM, RANGE, MEAN} from '../../src/shared/constants/fluxFunctions'

interface HTMLElementCM extends HTMLElement {
  CodeMirror: {
    doc: CodeMirror.Doc
  }
}

type $CM = JQuery<HTMLElementCM>

describe('DataExplorer', () => {
  beforeEach(() => {
    cy.flush()

    cy.signin()

    cy.fixture('routes').then(({explorer}) => {
      cy.visit(explorer)
    })
  })

  describe('raw script editing', () => {
    beforeEach(() => {
      cy.getByTestID('switch-to-script-editor').click()
    })

    it('enables the submit button when a query is typed', () => {
      cy.getByTestID('time-machine-submit-button').should('be.disabled')

      cy.getByTestID('flux-editor').within(() => {
        cy.get('textarea').type('yo', {force: true})
        cy.getByTestID('time-machine-submit-button').should('not.be.disabled')
      })
    })

    it('disables submit when a query is deleted', () => {
      cy.getByTestID('time-machine--bottom').then(() => {
        cy.get('textarea').type('from(bucket: "foo")', {force: true})
        cy.getByTestID('time-machine-submit-button').should('not.be.disabled')
        cy.get('textarea').type('{selectall} {backspace}', {force: true})
      })

      cy.getByTestID('time-machine-submit-button').should('be.disabled')
    })

    it.only('can use the function selector to build a query', () => {
      // remove new lines and spaces
      const strip = (s: string) => s.replace(/(\r\n|\n|\r| +)/g, '')

      cy.getByTestID('functions-toolbar-tab').click()

      cy.get<$CM>('.CodeMirror').then($cm => {
        const cm = $cm[0].CodeMirror
        cy.wrap(cm.doc).as('script')
        expect(cm.doc.getValue()).to.eq('')
      })

      cy.getByTestID('flux-function from').click()

      cy.get<Doc>('@script').then(doc => {
        const actual = doc.getValue().trim()
        const expected = strip(FROM.example)

        expect(strip(actual)).to.eq(expected)
      })

      cy.getByTestID('flux-function range').click()

      cy.get<Doc>('@script').then(doc => {
        const actual = strip(doc.getValue())
        const expected = strip(`${FROM.example}|>${RANGE.example}`)

        expect(actual).to.eq(expected)
      })

      cy.getByTestID('flux-function mean').click()

      cy.get<Doc>('@script').then(doc => {
        const actual = strip(doc.getValue())
        const expected = strip(
          `${FROM.example}|>${RANGE.example}|>${MEAN.example}`
        )

        expect(actual).to.eq(expected)
      })
    })
  })

  describe('visualizations', () => {
    describe('empty states', () => {
      it('shows an error if a query is syntactically invalid', () => {
        cy.getByTestID('switch-to-script-editor').click()

        cy.getByTestID('time-machine--bottom').within(() => {
          cy.get('textarea').type('from(', {force: true})
          cy.getByTestID('time-machine-submit-button').click()
        })

        cy.getByTestID('empty-graph-message').within(() => {
          cy.contains('Error').should('exist')
        })
      })
    })
  })
})
