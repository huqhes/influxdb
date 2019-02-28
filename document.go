package influxdb

import (
	"context"
)

type DocumentService interface {
	CreateDocumentStore(ctx context.Context, name string) (DocumentStore, error)
	FindDocumentStore(ctx context.Context, name string) (DocumentStore, error)
}

type Document struct {
	ID   ID           `json:"id"`
	Meta DocumentMeta `json:"meta"`
	Data interface{}  `json:"data,omitempty"` // TODO(desa): maybe this needs to be json.Marshaller & json.Unmarshaler
}

type DocumentMeta struct {
	Name string `json:"name"`
}

type DocumentStore interface {
	CreateDocument(ctx context.Context, d *Document, opts ...DocumentCreateOptions) error
	// TODO(desa): remove
	FindDocumentsByID(ctx context.Context, ids ...ID) ([]*Document, error)
	FindDocuments(ctx context.Context, opts ...DocumentFindOptions) ([]*Document, error) // TODO(desa): add additional search parameters.
	//UpdateDocument(ctx context.Context, id ID, d *Document) error
	// TODO(desa): remove
	DeleteDocuments(ctx context.Context, opts ...DocumentFindOptions) error
}

type DocumentIndex interface {
	AddDocumentOwner(ownerType string, userID ID) error

	GetOwnersDocuments(ownerType string, ownerID ID) ([]ID, error)
	GetDocumentsOwners(docID ID) ([]ID, error)

	IsOrgOwner(userID, orgID ID) error
	IsOrgMember(userID, orgID ID) error

	UsersOrgs(userID ID) ([]ID, error)
	// Label stuff here

	FindOrganizationByName(n string) (ID, error)
}

type DocumentCreateOptions func(DocumentIndex) error

type DocumentFindOptions func(DocumentIndex) ([]ID, error)

func WithOrg(org string) func(DocumentIndex) error {
	return func(idx DocumentIndex) error {
		oid, err := idx.FindOrganizationByName(org)
		if err != nil {
			return err
		}

		return idx.AddDocumentOwner("org", oid)
	}
}

func AuthorizedWithOrg(a Authorizer, org string) func(DocumentIndex) error {
	return func(idx DocumentIndex) error {
		// TODO(desa): make special case for tokens vs sessions.
		// essentially this should transform permissions to a set of queries.
		oid, err := idx.FindOrganizationByName(org)
		if err != nil {
			return err
		}

		if err := idx.IsOrgOwner(a.GetUserID(), oid); err != nil {
			return err
		}

		return idx.AddDocumentOwner("org", oid)
	}
}

func WhereOrg(org string) func(DocumentIndex) ([]ID, error) {
	return func(idx DocumentIndex) ([]ID, error) {
		oid, err := idx.FindOrganizationByName(org)
		if err != nil {
			return nil, err
		}
		return idx.GetOwnersDocuments("org", oid)
	}
}

func AuthorizedWhereOrg(a Authorizer, org string) func(DocumentIndex) ([]ID, error) {
	return func(idx DocumentIndex) ([]ID, error) {
		oid, err := idx.FindOrganizationByName(org)
		if err != nil {
			return nil, err
		}

		if err := idx.IsOrgMember(a.GetUserID(), oid); err != nil {
			return nil, err
		}

		return idx.GetOwnersDocuments("org", oid)
	}
}

func AuthorizedWhere(a Authorizer) func(DocumentIndex) ([]ID, error) {
	var ids []ID
	return func(idx DocumentIndex) ([]ID, error) {
		// TODO(desa): make special case for tokens vs sessions.
		dids, err := idx.GetOwnersDocuments("user", a.GetUserID())
		if err != nil {
			return nil, err
		}

		ids = append(ids, dids...)

		orgIDs, err := idx.UsersOrgs(a.GetUserID())
		if err != nil {
			return nil, err
		}

		for _, orgID := range orgIDs {
			dids, err := idx.GetOwnersDocuments("org", orgID)
			if err != nil {
				return nil, err
			}

			ids = append(ids, dids...)
		}

		return ids, nil
	}
}

func WhereID(docID ID) func(DocumentIndex) ([]ID, error) {
	return func(idx DocumentIndex) ([]ID, error) {
		return []ID{docID}, nil
	}
}

func AuthorizedWhereID(a Authorizer, docID ID) func(DocumentIndex) ([]ID, error) {
	return func(idx DocumentIndex) ([]ID, error) {
		oids, err := idx.GetDocumentsOwners(docID)
		if err != nil {
			return nil, err
		}

		for _, oid := range oids {
			// TODO(desa): this should be org owner/member depending on whether the action is read or write.
			if err := idx.IsOrgOwner(a.GetUserID(), oid); err == nil {
				return []ID{docID}, nil
			}
		}

		return nil, &Error{
			Code: EUnauthorized,
			Msg:  "authorizer cannot access document",
		}
	}
}
