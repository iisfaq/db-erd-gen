import { Node, Edge } from "reactflow";
import { Table } from "../../interface/inputData";

export function inputDataToNodeAndEdges(tablesArr: Table[]){

    const initNodes: Node[] = [];
    const initialEdges: Edge[] = [];

    let initTableDistanceX: number = 200;

    for(let table of tablesArr){

        const name = table.name;

        // Create Edge checking
        for(let [ind, k] of Object.entries(table.columns)){
            if(!!k.foreignTo){
                const refTable = tablesArr.find(t => t.name === k.foreignTo!.name);
                const refColumnExists = refTable && refTable.columns.some(col => col.name === k.foreignTo!.column);
                if (!refTable || !refColumnExists) {
                    console.warn(
                        `Foreign key reference not found: table "${k.foreignTo!.name}", column "${k.foreignTo!.column}" in table "${name}"`
                    );
                    continue;
                }

                const sourceHandle = `${k.foreignTo!.name}_${k.foreignTo!.column}_right`
                const targetHandle = `${name}_${k.name}_left`

                initialEdges.push({
                    "id": `reactflow__${sourceHandle}_${targetHandle}_gen`,
                    "source": k.foreignTo!.name,
                    "target": name,
                    "type": "custom",
                })
            }
        }

        const tableInfo = {
            name: name,
            columns: table.columns,
            position: table.position || { x: initTableDistanceX, y: 500 }
        } 

        initNodes.push({ 
            id: name, 
            type: 'textUpdater',
            position: table.position || { x: initTableDistanceX, y: 500 },
            data: tableInfo
        })

        initTableDistanceX += 250;
    } 

    return {
        nodes: initNodes,
        edges: initialEdges // No positions for edges, they are calculated in CustomEdge
    }

}