
!     velocity verlet algorithm

!     basic equations
!     r(t+dt) = r(t) + [dt*v(t)] + [dt*dt*a(t)/2]    A
!     v(t+dt) = v(t) + [dt/2]*[a(t)+a(t+dt)]         B


!     implementation
!       compute a(t) using r(t)
!       compute r(t+dt) from A
!       compute v(t+(dt/2)) = v(t) + [dt*a(t)/2]     C
!       compute a(t+dt) using r(t+dt)
!       using C in B
!               v(t+dt)=v(t+(dt/2)) + [dt*a(t+dt)/2]


        subroutine velverlet
        use common1

        real(r8_kind) maxdisp
        real(r8_kind) delx(tatom),dely(tatom),delz(tatom)

	integer i

!     computing the positions at time t+dt
!      and the velocities at time t+(dt/2)

888    maxdisp=0.0

       do i=1,natom

          delx(i)=(dtime*xvel(i))+(0.5*dtime*dtime*xacc(i))
          dely(i)=(dtime*yvel(i))+(0.5*dtime*dtime*yacc(i))
          delz(i)=(dtime*zvel(i))+(0.5*dtime*dtime*zacc(i))
          
          if (abs(delx(i)).gt.maxdisp) then
           maxdisp=abs(delx(i))
          end if
   
          if (abs(dely(i)).gt.maxdisp) then
           maxdisp=abs(dely(i)) 
          end if
   
          if (abs(delz(i)).gt.maxdisp) then
           maxdisp=abs(delz(i))
          end if
       enddo

       if (maxdisp.gt.dispcut) then
         write(20,*) 'time-step reduced; original ',dtime
         dtime=dtime*mtime
         write(20,*) 'time-step reduced; new      ',dtime
          write(20,*) 'stopping run '
         stop
!         go to 888
       end if

       do i=1,natom

         xpos(i)=xpos(i)+delx(i)
         ypos(i)=ypos(i)+dely(i)
         zpos(i)=zpos(i)+delz(i)

         dxvel(i)=xvel(i)+(0.5*dtime*xacc(i))
         dyvel(i)=yvel(i)+(0.5*dtime*yacc(i))
         dzvel(i)=zvel(i)+(0.5*dtime*zacc(i))

       enddo


!     adjusting new positions for periodicity

      do i=1,natom
        if (xpos(i).lt.0) then
               xpos(i) = xpos(i) + totlx
               xshf(i)=xshf(i)-1
        else if( xpos(i).gt.totlx) then
               xpos(i) = xpos(i) - totlx
               xshf(i)=xshf(i)+1
        endif
        if (ypos(i).lt.0) then
               ypos(i) = ypos(i) + totly
               yshf(i)=yshf(i)-1
        else if( ypos(i).gt.totly) then
               ypos(i) = ypos(i) - totly
               yshf(i)=yshf(i)+1
        endif
        if (zpos(i).lt.0) then
               zpos(i) = zpos(i) + totlz
               zshf(i)=zshf(i)-1
        else if( zpos(i).gt.totlz) then
               zpos(i) = zpos(i) - totlz
               zshf(i)=zshf(i)+1
        endif
      enddo


!     initialize forces and dummy positions to call potential
!     forces independent of velocities
!     computing the acceleration at time t+dt

      do i=1,natom
       dxfor(i)=0.0
       dyfor(i)=0.0
       dzfor(i)=0.0
       dxpos(i)=xpos(i)
       dypos(i)=ypos(i)
       dzpos(i)=zpos(i)
      enddo



!       call pot_mfvf
!       call pot_bg
!       call pot_sw
       call pot_ter


      do i=1,natom
       xfor(i)=dxfor(i)
       yfor(i)=dyfor(i)
       zfor(i)=dzfor(i)
       xacc(i)=dxfor(i)/mass(i)  ! assigning new accelerations
       yacc(i)=dyfor(i)/mass(i)
       zacc(i)=dzfor(i)/mass(i)
      enddo

      do i=1,natom
       xvel(i)=dxvel(i)+(0.5*dtime*xacc(i))  ! assigning new velocities
       yvel(i)=dyvel(i)+(0.5*dtime*yacc(i)) 
       zvel(i)=dzvel(i)+(0.5*dtime*zacc(i)) 
      enddo

      time = time + dtime

        return
        end subroutine velverlet

