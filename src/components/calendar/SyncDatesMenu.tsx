import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

const onSyncApple = () => {
  console.info('[SyncDatesMenu] Apple sync requested')
}

const onSyncGoogle = () => {
  console.info('[SyncDatesMenu] Google sync requested')
}

const onSyncAndroid = () => {
  console.info('[SyncDatesMenu] Android sync requested')
}

export function SyncDatesMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="bg-blue-600 text-white hover:bg-blue-700">
          Sync Dates
          <span className="ml-2 text-xs">▼</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onSelect={onSyncApple}>Sync to iPhone / Apple Calendar (.ics)</DropdownMenuItem>
        <DropdownMenuItem onSelect={onSyncGoogle}>Sync to Google Calendar</DropdownMenuItem>
        <DropdownMenuItem onSelect={onSyncAndroid}>Sync to Android Calendar (.ics or Google)</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default SyncDatesMenu
