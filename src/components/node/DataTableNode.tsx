import { Handle, Position } from 'reactflow';
import { Card, Text, Space, Badge, Grid, Box, Tooltip, rgba } from '@mantine/core';
import { Table } from '../../interface/inputData';
import TableForm from '../leftBar/components/TableForm';
import useTableStore from '../../store/zustandStore';
import BtnGhost from '../leftBar/components/BtnGhost';

type DataTableNodeProps = {
  data: Table
}

function DataTableNode({ data }: DataTableNodeProps) {

  const tableArray = useTableStore((state) => state.tableArray);

  return (
    <Card
      shadow="sm"
      radius="md"
      style={{
        height: `${47 + data.columns.length * 28}px`, padding: "10px",
        fontSize: "2px", width: "320px", background: "rgba(34, 139, 230, 0.5)"
      }}
    >
      <div style={{ pointerEvents: 'none' }}>

        <Card.Section>
          {/* Blue border drag handle */}
          <div
            style={{
              border: '2px solid #228be6',
              borderRadius: '8px',
              cursor: 'grab',
              width: '100%',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(34,139,230,0.08)',
              marginBottom: '4px',
              userSelect: 'none',
              pointerEvents: 'auto'
            }}
            data-drag-handle
          >
            <Text fz={15} ta="center" mt={0} style={{ width: '100%' }}>
              <Badge
                size="lg"
                tt="none"
                radius={"md"}
                leftSection={
                  <div>[{data.position?.x.toFixed(0)}, {data.position?.y.toFixed(0)}]
                    &nbsp;{data.name}&nbsp;
                    {data && !(data as any).isIsolated && (
                      <Badge size="xs" color="gray" variant="light" style={{ pointerEvents: 'none' }}>isolated</Badge>
                    )}
                  </div>
                }
                rightSection={
                  <div style={{ pointerEvents: 'auto', display: 'flex', flexDirection: 'row' }}>

                    <BtnGhost
                      mode={'create'}
                      editData={data}
                      allTableData={tableArray}

                      size={14}
                      color={"white"}
                    />
                    <span>&nbsp;</span>
                    <TableForm
                      mode={'edit'}
                      editData={data}
                      allTableData={tableArray}

                      size={14}
                      color={"white"}
                    />
                  </div>
                }
              >
                {data.name}
              </Badge>
            </Text>
          </div>
        </Card.Section>



        {/* Table body with pointer events disabled to prevent drag */}
        <div style={{ pointerEvents: 'none' }} onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>

          {data.columns.map((v, ind) => {

            const nodeDistance = 33 + ind * 24;

            const leftNodeName = `${data.name}_${v.name}_left`
            const rightNodeName = `${data.name}_${v.name}_right`

            return (
              <Box key={`${data.name}_${v.name}_rows`}>
                <Grid >
                  <Grid.Col span={2}>
                    <Text fz={8}>
                      {
                        v.isPrimaryKey
                          ? "PK"
                          : !!v.foreignTo
                            ? "FK"
                            : ""
                      }
                    </Text>
                  </Grid.Col>

                  <Grid.Col span={6}>
                    <Tooltip label={v.name}>
                      <Text fz={12}>
                        {v.name && v.name.length >= 20 ? v.name.slice(0, 20) + "..." : v.name}
                      </Text>
                    </Tooltip>
                  </Grid.Col>

                  <Grid.Col span={4}>
                    <Tooltip label={v.dataType}>
                      <Text fz={12}>
                        {v.dataType}
                      </Text>
                    </Tooltip>
                  </Grid.Col>
                </Grid>

                <Handle
                  type={!!v.foreignTo ? "target" : "source"}
                  position={Position.Left} id={leftNodeName}
                  style={{ top: nodeDistance, width: "10px", minWidth: "0px" }}
                />
                <Handle
                  type={!!v.foreignTo ? "target" : "source"}
                  position={Position.Right} id={rightNodeName}
                  style={{ top: nodeDistance, width: "10px", minWidth: "0px" }}
                />
              </Box>
            )
          }
          )}

        </div>
      </div>
    </Card>
  );
}


export default DataTableNode

