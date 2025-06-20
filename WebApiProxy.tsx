export class WebApiProxy implements ComponentFramework.WebApi{
    private host : string;

    constructor(host: string) {
        this.host = host;
    }

    createRecord(entityType: string, data: ComponentFramework.WebApi.Entity): Promise<ComponentFramework.LookupValue> {
        let requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        };
        return fetch(this.host+'/api/data/v9.2/'+entityType, requestOptions).then(response => {
            if (!response.ok) {
                throw new Error(`CreateRecord error -  status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            return {
                entityType: entityType,
                id: data.id
            };
        });
    }
    deleteRecord(entityType: string, id: string): Promise<ComponentFramework.LookupValue> {
        let requestOptions = {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        };
        return fetch(this.host+'/api/data/v9.2/'+entityType+"("+id+")", requestOptions).then(response => {
            if (!response.ok) {
                throw new Error(`DeleteRecord error -  status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            return {
                entityType: entityType,
                id: id
            };
        });
    }
    updateRecord(entityType: string, id: string, data: ComponentFramework.WebApi.Entity): Promise<ComponentFramework.LookupValue> {
        let requestOptions = {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        };
        return fetch(this.host+'/api/data/v9.2/'+entityType+"("+id+")", requestOptions).then(response => {
            if (!response.ok) {
                throw new Error(`updateRecord error -  status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            return {
                entityType: entityType,
                id: id
            };
        })
    }
    async retrieveMultipleRecords(entityType: string, options?: string, maxPageSize?: number): Promise<ComponentFramework.WebApi.RetrieveMultipleResponse> {
        let data =  await (await fetch(this.host+'/api/data/v9.2/'+entityType  + (options ?? ''))).json();

        return {
            entities: data.value,
            nextLink:"",
        };
    }
    async retrieveRecord(entityType: string, id: string, options?: string): Promise<ComponentFramework.WebApi.Entity> {
        return await fetch(this.host+'/api/data/v9.2/'+entityType +"("+id+")" + (options ?? ''));
    }

    async execute(request: any): Promise<any> {
        const requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request)
        };

        return await fetch(this.host+'/api/data/v9.2/operation/'+request.getMetadata().operationName, requestOptions)
    }
}