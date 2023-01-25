import rewire from "rewire";
const { parse } = require("graphql/language");

global.Modules = {}

const app = rewire("./app.js");

const mockParse = parse(`
schema {
    query: Query
    mutation: Mutation
}

""" An author of a piece of literature. """
type Author {
    """ The primary key for this author. """
    id: ID!
    """ The name of the author. """
    name: String!
    """ The year the author was born. """
    yearBorn: Int!
    """ The year the author died (or null if alive)."""
    yearDied: Int
    """ Where the author was born, if known. """
    whereBorn: String
    """ A short biography of the author. """
    biography: String
    """ The literary awards won by this author. """
    awards: [Award]
    """ The books by an author. """
    books: [Book]
}

""" An award for excellence in literature. """
type Award {
    """ The title of the book that won the award."""
    bookTitle: String
    title: String @deprecated(reason: "Use awardTitle for all new clients.")
    """ The year that the award was given. """
    year: Int
    """ The author who won the award."""
    authorName: String
    """ The title of the award, i.e. 'Best Novel'."""
    awardTitle: String
    """ The name of the award, i.e. 'Hugo Award'."""
    awardName: String
    """ Award supplierID"""
    awardSupplierId: String
}

""" A book (work of literature)."""
type Book {
    """ The title of the book. """
    title: String
    """ The author of the book. """
    author: String
    """ Who published the book. """
    publisher: String
    """ The publication date. """
    published_date: String
    """ The ISBN for a book. """
    isbn: String
}

type Mutation {
    """ Create a new author. """
    addAuthor(name: String!, yearBorn: Int!, biography: String!): Author!
    """ Create a new review for a book. """
    addReview(bookTitle: String!, review: String!, rating: Int!): Boolean!
}

type Query {
    """ Get a list of authors. In REST this might be: /api/v1/authors?filter=&sort= """
    authors(filter: String, sort: String): [Author!]!
    """ Get a list of literary awards."""
    awards: [Award]
    """ Get a list of books. """
    books: [Book]
}`);

app.__set__("Modules", {
    parse: mockParse,
    visit: () => ({})
});
