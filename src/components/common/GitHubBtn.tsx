import { IconBrandGithub } from '@tabler/icons-react';
import { Tooltip, ActionIcon } from '@mantine/core';

function GitHubBtn() {
  return (
    <Tooltip label="Open GitHub project page" withArrow>
      <ActionIcon
        variant="light"
        onClick={() => {
          window.open('https://github.com/iisfaq/db-erd-gen', '_blank');
        }}
        title="Open GitHub project page"
      >
        <IconBrandGithub size={18} />
      </ActionIcon>
    </Tooltip>
  );
}

export default GitHubBtn
